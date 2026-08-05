import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MessageBubble, MessageStatus } from '@/components/chat/MessageBubble';
import { MessageReactionPopover } from '@/components/chat/MessageReactionPopover';
import { VoiceRecorderBar } from '@/components/chat/VoiceRecorderBar';
import { ChatBackgroundLayer } from '@/components/chat/ChatBackgroundLayer';
import { ChatBackgroundPicker } from '@/components/chat/ChatBackgroundPicker';
import { FireGlowWrap } from '@/components/ui/FireGlowWrap';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { playSound } from '@/utils/soundFX';
import { ChatBgTheme, getChatBgTheme, setChatBgTheme } from '@/utils/chatBackgroundPrefs';
import { StarRating } from '@/components/ui/StarRating';
import { enqueueOutbox, getOutbox, onReconnect, removeFromOutbox } from '@/utils/offlineOutbox';

const STATUS_META: Record<string, { label: string; color: string }> = {
  submitted:     { label: 'قيد الانتظار',   color: '#f59e0b' },
  in_review:     { label: 'جارٍ المعالجة',   color: '#3b82f6' },
  needs_changes: { label: 'بحاجة لتعديل',    color: '#f97316' },
  approved:      { label: 'مكتملة',          color: '#22c55e' },
  rejected:      { label: 'مرفوضة',          color: '#ef4444' },
};

const CAT_EMOJI: Record<string, string> = {
  military: '🪖', education: '🎓', welfare: '❤️', general: '⭐',
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  message_type: string;
  attachment_url: string | null;
  reply_to_id: string | null;
  read_at: string | null;
  created_at: string;
  reactions: { emoji: string; user_id: string }[];
};

type RequestDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  assigned_employee_id: string | null;
  employee: { given_name: string; family_name: string; avatar_key: string | null } | null;
};

async function uploadAttachment(uri: string, userId: string, kind: 'image' | 'voice' | 'video'): Promise<string | null> {
  try {
    const ext = kind === 'voice'
      ? 'm4a'
      : (uri.split('.').pop()?.toLowerCase() ?? (kind === 'video' ? 'mp4' : 'jpg'));
    const path = `chat/${userId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const contentType = kind === 'voice'
      ? 'audio/m4a'
      : kind === 'video'
        ? `video/${ext === 'mov' ? 'quicktime' : ext}`
        : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, blob, { contentType, upsert: false });
    if (error) { console.error('upload failed:', error.message); return null; }
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [req, setReq] = useState<RequestDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDesc, setShowDesc] = useState(false);
  const [recording, setRecording] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [employeeTyping, setEmployeeTyping] = useState(false);
  const [employeeOnline, setEmployeeOnline] = useState(false);
  const [bgTheme, setBgTheme] = useState<ChatBgTheme>('none');
  const [existingRating, setExistingRating] = useState<{ stars: number; comment: string | null } | null | undefined>(undefined);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);

  useEffect(() => { getChatBgTheme().then(setBgTheme); }, []);

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingBroadcast = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [rRes, mRes] = await Promise.all([
      supabase
        .from('requests')
        .select('id, title, description, category, status, created_at, assigned_employee_id, employee:profiles!assigned_employee_id(given_name, family_name, avatar_key)')
        .eq('id', id)
        .single(),
      supabase
        .from('request_messages')
        .select('id, sender_id, body, message_type, attachment_url, reply_to_id, read_at, created_at, reactions:request_message_reactions(emoji, user_id)')
        .eq('request_id', id)
        .order('created_at', { ascending: true })
        .limit(200),
    ]);
    if (rRes.data) setReq(rRes.data as unknown as RequestDetail);
    if (mRes.data) setMessages(mRes.data as unknown as Message[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!id || req?.status !== 'approved') return;
    supabase
      .from('request_ratings')
      .select('stars, comment')
      .eq('request_id', id)
      .maybeSingle()
      .then(({ data }) => setExistingRating(data ?? null));
  }, [id, req?.status]);

  async function handleSubmitRating() {
    if (!id || !req?.assigned_employee_id || !session?.user.id || ratingStars < 1) return;
    setRatingSaving(true);
    const { error } = await supabase.from('request_ratings').insert({
      request_id: id,
      customer_id: session.user.id,
      employee_id: req.assigned_employee_id,
      stars: ratingStars,
      comment: ratingComment.trim() || null,
    });
    setRatingSaving(false);
    if (!error) setExistingRating({ stars: ratingStars, comment: ratingComment.trim() || null });
  }

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel(`request-detail-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'request_messages',
        filter: `request_id=eq.${id}`,
      }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_message_reactions' }, () => loadData())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'requests',
        filter: `id=eq.${id}`,
      }, () => loadData())
      .subscribe();

    const typingChannel = supabase
      .channel(`request-typing-${id}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { senderId } = payload.payload as { senderId: string };
        if (senderId === session?.user.id) return;
        setEmployeeTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setEmployeeTyping(false), 3000);
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, loadData, session?.user.id]);

  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current || !session?.user.id) return;
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;
    typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { senderId: session.user.id } });
  }, [session?.user.id]);

  // last_active_at isn't directly client-readable (deliberately excluded
  // from the profiles SELECT grant) — the online/offline badge goes
  // through a security-definer RPC that only returns the derived boolean.
  useEffect(() => {
    const employeeId = req?.assigned_employee_id;
    if (!employeeId) { setEmployeeOnline(false); return; }
    let active = true;
    function checkOnline() {
      supabase.rpc('get_employee_online_status', { p_employee_id: employeeId }).then(({ data }) => {
        if (active) setEmployeeOnline(!!data);
      });
    }
    checkOnline();
    const interval = setInterval(checkOnline, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, [req?.assigned_employee_id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Mark the other party's messages as read once they're visible on screen.
  useEffect(() => {
    if (!session?.user.id) return;
    const unread = messages.filter((m) => m.sender_id !== session.user.id && !m.read_at);
    if (unread.length === 0) return;
    supabase.from('request_messages').update({ read_at: new Date().toISOString() }).in('id', unread.map((m) => m.id)).then(() => {});
  }, [messages, session?.user.id]);

  async function sendMessage() {
    if (!text.trim() || !session?.user.id || !id) return;
    const body = text.trim();
    const replyId = replyTo?.id ?? null;
    setText('');
    setReplyTo(null);
    setSending(true);
    const { error } = await supabase.from('request_messages').insert({
      request_id: id,
      sender_id: session.user.id,
      body,
      message_type: 'text',
      reply_to_id: replyId,
    });
    if (error) {
      // Offline (or a transient network error) — keep the message locally
      // instead of losing it; flushOutbox resends it the moment the
      // device reconnects.
      await enqueueOutbox(id, body);
    } else {
      playSound('messageSent');
    }
    setSending(false);
  }

  const flushOutbox = useCallback(async () => {
    if (!id || !session?.user.id) return;
    const queued = await getOutbox(id);
    for (const item of queued) {
      const { error } = await supabase.from('request_messages').insert({
        request_id: id,
        sender_id: session.user.id,
        body: item.body,
        message_type: 'text',
      });
      if (!error) await removeFromOutbox(id, item.localId);
    }
    if (queued.length) loadData();
  }, [id, session?.user.id, loadData]);

  useEffect(() => {
    flushOutbox();
    return onReconnect(flushOutbox);
  }, [flushOutbox]);

  async function pickAndSendImage() {
    if (!session?.user.id || !id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور والفيديوهات من إعدادات الجهاز لإرسال المرفقات.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === 'video';
    setSending(true);
    const url = await uploadAttachment(asset.uri, session.user.id, isVideo ? 'video' : 'image');
    if (url) {
      await supabase.from('request_messages').insert({
        request_id: id, sender_id: session.user.id, body: isVideo ? '🎬 فيديو' : '📷 صورة',
        message_type: isVideo ? 'video' : 'image', attachment_url: url, reply_to_id: replyTo?.id ?? null,
      });
      setReplyTo(null);
    }
    setSending(false);
  }

  async function sendVoice(uri: string, durationMs: number) {
    if (!session?.user.id || !id) return;
    setRecording(false);
    if (durationMs < 800) return; // too short to be intentional
    setSending(true);
    const url = await uploadAttachment(uri, session.user.id, 'voice');
    if (url) {
      await supabase.from('request_messages').insert({
        request_id: id, sender_id: session.user.id, body: '🎤 رسالة صوتية',
        message_type: 'voice', attachment_url: url,
      });
    }
    setSending(false);
  }

  async function pickReaction(messageId: string, emoji: string) {
    if (!session?.user.id) return;
    setReactingId(null);
    const msg = messages.find((m) => m.id === messageId);
    const mine = msg?.reactions.find((r) => r.user_id === session.user.id);
    if (mine) await supabase.from('request_message_reactions').delete().eq('message_id', messageId).eq('user_id', session.user.id);
    if (!mine || mine.emoji !== emoji) {
      await supabase.from('request_message_reactions').insert({ message_id: messageId, user_id: session.user.id, emoji });
      playSound('reaction');
    }
  }

  function summarizeReactions(reactions: { emoji: string; user_id: string }[]) {
    const counts: Record<string, number> = {};
    reactions.forEach((r) => { counts[r.emoji] = (counts[r.emoji] ?? 0) + 1; });
    return Object.entries(counts).map(([emoji, count]) => ({ emoji, count, mine: false }));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  if (!req) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>لم يتم العثور على الطلب</Text>
      </View>
    );
  }

  const st = STATUS_META[req.status] ?? { label: req.status, color: COLORS.muted };
  const employeeName = req.employee
    ? `${req.employee.given_name} ${req.employee.family_name}`
    : null;
  const catEmoji = CAT_EMOJI[req.category] ?? '📁';
  const isClosed = req.status === 'approved' || req.status === 'rejected';

  return (
    <ScreenBg>
      <ChatBackgroundLayer theme={bgTheme} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Navigation header */}
        <View style={styles.navHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.navCenter}>
            <Text style={styles.navTitle} numberOfLines={1}>{catEmoji} {req.title}</Text>
            {employeeTyping ? (
              <Text style={styles.typingIndicator}>الموظف يكتب...</Text>
            ) : (
              <View style={[styles.statusPill, { backgroundColor: st.color + '20', borderColor: st.color + '50' }]}>
                <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
              </View>
            )}
          </View>
          {/* Chat background theme */}
          <Pressable onPress={() => setShowBgPicker(true)} style={styles.infoBtn} hitSlop={12}>
            <Text style={styles.infoBtnText}>🎨</Text>
          </Pressable>
          {/* Description toggle */}
          <Pressable onPress={() => setShowDesc((v) => !v)} style={styles.infoBtn} hitSlop={12}>
            <Text style={styles.infoBtnText}>ℹ</Text>
          </Pressable>
        </View>
        <ChatBackgroundPicker
          visible={showBgPicker}
          current={bgTheme}
          onSelect={(t) => { setBgTheme(t); setChatBgTheme(t); setShowBgPicker(false); }}
          onClose={() => setShowBgPicker(false)}
        />

        {/* Collapsible description */}
        {showDesc && (
          <View style={styles.descPanel}>
            {req.description ? (
              <Text style={styles.descText}>{req.description}</Text>
            ) : null}
            <View style={styles.descMeta}>
              {employeeName ? (
                <View style={styles.employeeChip}>
                  <Text style={styles.employeeChipEmoji}>👤</Text>
                  <Text style={styles.employeeChipName}>{employeeName}</Text>
                  <View style={[styles.onlineDot, { backgroundColor: employeeOnline ? COLORS.green : COLORS.muted }]} />
                  <Text style={[styles.onlineLabel, { color: employeeOnline ? COLORS.green : COLORS.muted }]}>
                    {employeeOnline ? 'نشط' : 'غير نشط'}
                  </Text>
                </View>
              ) : req.status === 'submitted' ? (
                <FireGlowWrap borderRadius={RADIUS.sm}>
                  <Pressable
                    style={({ pressed }) => [styles.findEmployeeBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => router.push({
                      pathname: '/(customer)/requests/matching',
                      params: { requestId: req.id, category: req.category },
                    })}
                  >
                    <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
                    <Text style={styles.findEmployeeBtnText}>🔍 البحث عن موظف حالي</Text>
                  </Pressable>
                </FireGlowWrap>
              ) : (
                <Text style={styles.noEmployee}>لم يُعيَّن موظف بعد</Text>
              )}
            </View>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={8}
          renderItem={({ item }) => {
            const isMine = item.sender_id === session?.user.id;
            const replySource = item.reply_to_id ? messages.find((m) => m.id === item.reply_to_id) : null;
            const status: MessageStatus = item.read_at ? 'read' : 'sent';
            return (
              <View>
                {reactingId === item.id && (
                  <View style={{ position: 'relative' }}>
                    <MessageReactionPopover
                      align={isMine ? 'end' : 'start'}
                      onPick={(emoji) => pickReaction(item.id, emoji)}
                      onReply={() => { setReplyTo(item); setReactingId(null); }}
                    />
                  </View>
                )}
                <MessageBubble
                  isMine={isMine}
                  body={item.body}
                  messageType={item.message_type}
                  attachmentUrl={item.attachment_url}
                  attachmentType={
                    item.message_type === 'image' ? 'image' :
                    item.message_type === 'voice' ? 'voice' :
                    item.message_type === 'video' ? 'video' : null
                  }
                  senderAvatarKey={!isMine ? req?.employee?.avatar_key : undefined}
                  onSenderPress={!isMine && req?.assigned_employee_id ? () => router.push({ pathname: '/user/[userId]', params: { userId: req.assigned_employee_id! } }) : undefined}
                  timestamp={item.created_at}
                  status={isMine ? status : undefined}
                  reactions={summarizeReactions(item.reactions)}
                  replyTo={replySource ? { body: replySource.body } : null}
                  onLongPress={() => setReactingId(reactingId === item.id ? null : item.id)}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>💬</Text>
              <Text style={styles.emptyChatText}>لا توجد رسائل بعد</Text>
              <Text style={styles.emptyChatSub}>ابدأ المحادثة مع الموظف</Text>
            </View>
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Reply preview */}
        {replyTo && !isClosed && (
          <View style={styles.replyBar}>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Text style={styles.replyBarClose}>✕</Text>
            </Pressable>
            <Text style={styles.replyBarText} numberOfLines={1}>الرد على: {replyTo.body}</Text>
          </View>
        )}

        {/* Input bar */}
        {!isClosed ? (
          recording ? (
            <VoiceRecorderBar onSend={sendVoice} onCancel={() => setRecording(false)} />
          ) : (
            <View style={styles.inputBar}>
              {text.trim() ? (
                <Pressable
                  style={({ pressed }) => [styles.sendBtn, sending && styles.sendBtnDisabled, pressed && styles.sendBtnPressed]}
                  onPress={sendMessage}
                  disabled={sending}
                >
                  {sending ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.sendIcon}>↑</Text>}
                </Pressable>
              ) : (
                <Pressable style={styles.micBtn} onPress={() => setRecording(true)} disabled={sending}>
                  <Text style={styles.micIcon}>🎤</Text>
                </Pressable>
              )}
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={(t) => { setText(t); broadcastTyping(); }}
                placeholder="اكتب رسالة..."
                placeholderTextColor={COLORS.white40}
                style={styles.textInput}
                textAlign="right"
                multiline
                maxLength={2000}
              />
              <Pressable style={styles.imageBtn} onPress={pickAndSendImage} disabled={sending}>
                <Text style={styles.imageBtnIcon}>🖼️</Text>
              </Pressable>
            </View>
          )
        ) : (
          <View style={styles.closedBar}>
            <Text style={styles.closedBarText}>
              {req.status === 'approved' ? '✅ تم إنجاز الطلب' : '❌ تم رفض الطلب'}
            </Text>
            {req.status === 'approved' && existingRating !== undefined && (
              <View style={styles.ratingCard}>
                {existingRating ? (
                  <>
                    <Text style={styles.ratingTitle}>تقييمك للموظف</Text>
                    <StarRating value={existingRating.stars} readonly size={24} />
                    {existingRating.comment ? <Text style={styles.ratingComment}>{existingRating.comment}</Text> : null}
                  </>
                ) : (
                  <>
                    <Text style={styles.ratingTitle}>قيّم الموظف والخدمة</Text>
                    <StarRating value={ratingStars} onChange={setRatingStars} size={30} />
                    <TextInput
                      value={ratingComment}
                      onChangeText={setRatingComment}
                      placeholder="اكتب ملاحظة (اختياري)"
                      placeholderTextColor={COLORS.white40}
                      style={styles.ratingInput}
                      textAlign="right"
                    />
                    <Pressable
                      onPress={handleSubmitRating}
                      disabled={ratingStars < 1 || ratingSaving}
                      style={[styles.ratingSubmitBtn, (ratingStars < 1 || ratingSaving) && { opacity: 0.5 }]}
                    >
                      <Text style={styles.ratingSubmitText}>{ratingSaving ? '...' : 'إرسال التقييم'}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.muted },

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230,171,44,0.15)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(230,171,44,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 24, color: COLORS.gold, lineHeight: 28 },
  navCenter: { flex: 1, gap: 3, alignItems: 'flex-end' },
  navTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  typingIndicator: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, alignSelf: 'flex-end' },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: { fontSize: 17, color: COLORS.white70 },

  descPanel: {
    backgroundColor: '#1a2030',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230,171,44,0.12)',
    padding: 14,
    gap: 8,
  },
  descText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.white70,
    lineHeight: 20,
    textAlign: 'right',
  },
  descMeta: { alignItems: 'flex-end' },
  employeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(230,171,44,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  employeeChipEmoji: { fontSize: 13 },
  employeeChipName: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  onlineDot: { width: 6, height: 6, borderRadius: 3, marginStart: 2 },
  onlineLabel: { fontFamily: FONTS.bold, fontSize: 10 },
  noEmployee: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  findEmployeeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  findEmployeeBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },

  msgList: { padding: 12, paddingBottom: 8 },
  emptyChat: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyChatEmoji: { fontSize: 40 },
  emptyChatText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  emptyChatSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.goldDim,
    borderTopWidth: 1,
    borderTopColor: COLORS.goldBorder,
  },
  replyBarClose: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  replyBarText: { flex: 1, fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gold, textAlign: 'right' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    gap: 8,
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230,171,44,0.15)',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingTop: 10,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
    maxHeight: 120,
    minHeight: 44,
  },
  imageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  imageBtnIcon: { fontSize: 17 },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: COLORS.goldBorder, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 18 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(230,171,44,0.3)' },
  sendBtnPressed: { opacity: 0.75 },
  sendIcon: { fontSize: 22, color: '#000', fontFamily: FONTS.bold },

  closedBar: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  closedBarText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  ratingCard: { marginTop: 12, paddingHorizontal: 20, alignItems: 'center', gap: 10, width: '100%' },
  ratingTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  ratingComment: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'center' },
  ratingInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.white,
  },
  ratingSubmitBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 10 },
  ratingSubmitText: { fontFamily: FONTS.bold, fontSize: 13, color: '#000' },
});
