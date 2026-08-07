import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { MessageBubble, MessageStatus } from '@/components/chat/MessageBubble';
import { ReactionPickerOverlay } from '@/components/ui/ReactionPickerOverlay';
import { buildChatReactions, DELETE_KEY, REPLY_KEY } from '@/constants/chatReactions';
import { confirmDelete } from '@/lib/confirmDelete';
import { VoiceRecorderBar } from '@/components/chat/VoiceRecorderBar';
import { Avatar } from '@/components/chat/Avatar';
import { ChatBackgroundLayer } from '@/components/chat/ChatBackgroundLayer';
import { ChatBackgroundPicker } from '@/components/chat/ChatBackgroundPicker';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { playSound } from '@/utils/soundFX';
import { ChatBgTheme, getChatBgTheme, setChatBgTheme } from '@/utils/chatBackgroundPrefs';

interface OtherUser {
  id: string;
  given_name: string | null;
  family_name: string | null;
  role: string;
  avatar_key: string | null;
}

interface DmMessage {
  id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  reply_to_id: string | null;
  read_at: string | null;
  created_at: string;
  message_type: string | null;
  reactions: { emoji: string; user_id: string }[];
}

function displayNameFor(p: OtherUser | null): string {
  if (!p) return 'عضو';
  return [p.given_name, p.family_name].filter(Boolean).join(' ') || 'عضو';
}

async function uploadAttachment(uri: string, userId: string, kind: 'image' | 'voice' | 'video'): Promise<string | null> {
  try {
    const ext = kind === 'voice'
      ? 'm4a'
      : (uri.split('.').pop()?.toLowerCase() ?? (kind === 'video' ? 'mp4' : 'jpg'));
    const path = `chat/${userId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    // React Native's Blob polyfill is unreliable for binary upload bodies —
    // it can report the correct size while silently sending empty/corrupted
    // data. arrayBuffer() is Supabase's own recommended path for RN.
    const arrayBuffer = await response.arrayBuffer();
    const contentType = kind === 'voice'
      ? 'audio/m4a'
      : kind === 'video'
        ? `video/${ext === 'mov' ? 'quicktime' : ext}`
        : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) { console.error('upload failed:', error.message); return null; }
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

const TEMPLATES = {
  welcome:      'أهلاً وسهلاً! أنا مستعد لمساعدتك. كيف يمكنني خدمتك؟',
  requirements: 'لإتمام طلبك، نحتاج المستندات التالية:',
  payment:      'رسوم الخدمة هي: [المبلغ]. يمكنك الدفع عبر:',
};

const TYPING_TIMEOUT_MS = 3000;
const TYPING_BROADCAST_INTERVAL_MS = 2000;

export default function DmThread() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { profile, loading } = useAuth();

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [recording, setRecording] = useState(false);
  const [replyTo, setReplyTo] = useState<DmMessage | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [bgTheme, setBgTheme] = useState<ChatBgTheme>('none');
  const [showBgPicker, setShowBgPicker] = useState(false);

  useEffect(() => { getChatBgTheme().then(setBgTheme); }, []);

  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingBroadcast = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile || !threadId) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function loadMessages() {
      supabase
        .from('direct_messages')
        .select('id, sender_id, body, attachment_url, reply_to_id, read_at, created_at, message_type, reactions:direct_message_reactions(emoji, user_id)')
        .eq('thread_id', threadId)
        .order('created_at')
        .then(({ data }) => {
          if (active) setMessages((data ?? []) as unknown as DmMessage[]);
        });
    }

    async function init() {
      const { data: thread } = await supabase
        .from('direct_message_threads')
        .select('id, user_a_id, user_b_id')
        .eq('id', threadId)
        .maybeSingle();

      if (!active) return;
      if (!thread) { setNotFound(true); setInitializing(false); return; }

      const otherId = thread.user_a_id === profile!.id ? thread.user_b_id : thread.user_a_id;

      const { data: other } = await supabase
        .from('profiles')
        .select('id, given_name, family_name, role, avatar_key')
        .eq('id', otherId)
        .maybeSingle();

      if (!active) return;
      setOtherUser(other ?? null);
      loadMessages();
      setInitializing(false);

      channel = supabase
        .channel(`dm-thread-${threadId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `thread_id=eq.${threadId}` }, loadMessages)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_message_reactions' }, loadMessages)
        .on('broadcast', { event: 'typing' }, (payload) => {
          const { userId } = payload.payload as { userId: string };
          if (userId === profile!.id) return;
          setOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
        })
        .subscribe();
      channelRef.current = channel;
    }

    init();
    return () => {
      active = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (channel) supabase.removeChannel(channel);
    };
    // Deliberately depends on the stable id, not the whole profile object —
    // reconnecting this realtime channel on every unrelated profile field
    // change would be wasteful (same convention throughout this codebase).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, threadId]);

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !profile) return;
    const now = Date.now();
    if (now - lastTypingBroadcast.current < TYPING_BROADCAST_INTERVAL_MS) return;
    lastTypingBroadcast.current = now;
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: profile.id } });
  }, [profile]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  // Mark the other party's messages as read once viewed.
  useEffect(() => {
    if (!profile?.id) return;
    const unread = messages.filter((m) => m.sender_id !== profile.id && !m.read_at);
    if (unread.length === 0) return;
    supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).in('id', unread.map((m) => m.id)).then(() => {});
  }, [messages, profile?.id]);

  async function handleSend() {
    const text = body.trim();
    if (!text || !profile || !threadId) return;
    setSending(true);
    setBody('');
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    await supabase.from('direct_messages').insert({
      thread_id: threadId,
      sender_id: profile.id,
      body: text,
      message_type: 'text',
      reply_to_id: replyId,
    });
    playSound('messageSent');
    setSending(false);
  }

  async function pickAndSendImage() {
    if (!profile || !threadId) return;
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
    const url = await uploadAttachment(asset.uri, profile.id, isVideo ? 'video' : 'image');
    if (url) {
      await supabase.from('direct_messages').insert({
        thread_id: threadId, sender_id: profile.id, body: isVideo ? '🎬 فيديو' : '📷 صورة',
        message_type: isVideo ? 'video' : 'image', attachment_url: url, reply_to_id: replyTo?.id ?? null,
      });
      setReplyTo(null);
    } else {
      Alert.alert('تعذّر الإرسال', 'حدث خطأ أثناء رفع المرفق، حاول مرة أخرى.');
    }
    setSending(false);
  }

  async function sendVoice(uri: string, durationMs: number) {
    if (!profile || !threadId) return;
    setRecording(false);
    if (durationMs < 800) return;
    setSending(true);
    const url = await uploadAttachment(uri, profile.id, 'voice');
    if (url) {
      await supabase.from('direct_messages').insert({
        thread_id: threadId, sender_id: profile.id, body: '🎤 رسالة صوتية',
        message_type: 'voice', attachment_url: url,
      });
    } else {
      Alert.alert('تعذّر الإرسال', 'حدث خطأ أثناء رفع الرسالة الصوتية، حاول مرة أخرى.');
    }
    setSending(false);
  }

  async function pickReaction(messageId: string, emoji: string) {
    if (!profile?.id) return;
    const msg = messages.find((m) => m.id === messageId);
    const mine = msg?.reactions.find((r) => r.user_id === profile.id);
    if (mine) await supabase.from('direct_message_reactions').delete().eq('message_id', messageId).eq('user_id', profile.id);
    if (!mine || mine.emoji !== emoji) {
      await supabase.from('direct_message_reactions').insert({ message_id: messageId, user_id: profile.id, emoji });
      playSound('reaction');
    }
  }

  function summarizeReactions(reactions: { emoji: string; user_id: string }[]) {
    const counts: Record<string, number> = {};
    reactions.forEach((r) => { counts[r.emoji] = (counts[r.emoji] ?? 0) + 1; });
    return Object.entries(counts).map(([emoji, count]) => ({ emoji, count, mine: false }));
  }

  async function applyTemplate(key: keyof typeof TEMPLATES) {
    setBody(TEMPLATES[key]);
  }

  if (loading || initializing) {
    return (
      <ScreenBg>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </ScreenBg>
    );
  }

  if (notFound) {
    return (
      <ScreenBg>
        <View style={styles.center}>
          <Text style={styles.emptyText}>المحادثة غير موجودة</Text>
        </View>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
      <ChatBackgroundLayer theme={bgTheme} />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backArrow}>›</Text>
        </Pressable>
        <Avatar
          avatarKey={otherUser?.avatar_key}
          name={otherUser?.given_name}
          seed={otherUser?.id}
          size={38}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {displayNameFor(otherUser)}
          </Text>
          <Text style={[styles.headerSub, otherTyping && styles.headerSubTyping]}>
            {otherTyping ? 'يكتب...' : 'محادثة خاصة'}
          </Text>
        </View>
        <Pressable onPress={() => setShowBgPicker(true)} style={styles.bgBtn} hitSlop={8}>
          <Text style={styles.bgBtnIcon}>🎨</Text>
        </Pressable>
      </View>
      <ChatBackgroundPicker
        visible={showBgPicker}
        current={bgTheme}
        onSelect={(t) => { setBgTheme(t); setChatBgTheme(t); setShowBgPicker(false); }}
        onClose={() => setShowBgPicker(false)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.msgList}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={8}
          renderItem={({ item }) => {
            const isMine = item.sender_id === profile!.id;
            const replySource = item.reply_to_id ? messages.find((m) => m.id === item.reply_to_id) : null;
            const status: MessageStatus = item.read_at ? 'read' : 'sent';
            return (
              <ReactionPickerOverlay
                reactions={buildChatReactions(isMine)}
                align={isMine ? 'end' : 'start'}
                onSelectReaction={(key) => {
                  // Reply rides in the bar as a seventh slot so long-press
                  // still offers it, exactly as the old popover did.
                  if (key === REPLY_KEY) setReplyTo(item);
                  else if (key === DELETE_KEY) {
                    confirmDelete({
                      kind: 'message',
                      table: 'direct_messages',
                      id: item.id,
                      // Drop it locally too: the realtime DELETE event is the usual
                      // path, but this keeps the list right if that socket is down.
                      onDeleted: () => setMessages((cur) => cur.filter((m) => m.id !== item.id)),
                    });
                  }
                  else pickReaction(item.id, key);
                }}
              >
                <MessageBubble
                  body={item.body ?? ''}
                  isMine={isMine}
                  senderAvatarKey={!isMine ? otherUser?.avatar_key : undefined}
                  onSenderPress={!isMine && otherUser ? () => router.push({ pathname: '/user/[userId]', params: { userId: otherUser.id } }) : undefined}
                  timestamp={item.created_at}
                  messageType={item.message_type ?? undefined}
                  attachmentUrl={item.attachment_url}
                  attachmentType={
                    item.message_type === 'image' ? 'image' :
                    item.message_type === 'voice' ? 'voice' :
                    item.message_type === 'video' ? 'video' : null
                  }
                  status={isMine ? status : undefined}
                  reactions={summarizeReactions(item.reactions)}
                  replyTo={replySource ? { body: replySource.body ?? '' } : null}
                />
              </ReactionPickerOverlay>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>لا توجد رسائل بعد</Text>
            </View>
          }
        />

        {/* Employee templates */}
        {profile?.role === 'employee' && (
          <View style={styles.templates}>
            {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map(key => (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.templateBtn, pressed && styles.templateBtnPressed]}
                onPress={() => applyTemplate(key)}
              >
                <Text style={styles.templateText}>
                  {key === 'welcome' ? 'ترحيب' : key === 'requirements' ? 'متطلبات' : 'دفع'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Reply preview */}
        {replyTo && (
          <View style={styles.replyBar}>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Text style={styles.replyBarClose}>✕</Text>
            </Pressable>
            <Text style={styles.replyBarText} numberOfLines={1}>الرد على: {replyTo.body}</Text>
          </View>
        )}

        {/* Input */}
        {recording ? (
          <VoiceRecorderBar onSend={sendVoice} onCancel={() => setRecording(false)} />
        ) : (
          <View style={styles.inputRow}>
            {body.trim() ? (
              <Pressable
                onPress={handleSend}
                disabled={sending}
                style={({ pressed }) => [styles.sendBtn, sending && styles.sendBtnDisabled, pressed && styles.sendBtnPressed]}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.micBtn} onPress={() => setRecording(true)} disabled={sending}>
                <Text style={styles.micIcon}>🎤</Text>
              </Pressable>
            )}
            <TextInput
              value={body}
              onChangeText={(t) => { setBody(t); broadcastTyping(); }}
              placeholder="اكتب رسالة..."
              placeholderTextColor={COLORS.white40}
              style={styles.input}
              multiline
              textAlign="right"
            />
            <Pressable style={styles.imageBtn} onPress={pickAndSendImage} disabled={sending}>
              <Text style={styles.imageBtnIcon}>🖼️</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.white10,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: COLORS.gold,
    lineHeight: 32,
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
    textAlign: 'right',
  },
  headerSubTyping: { color: COLORS.gold, fontFamily: FONTS.bold },
  bgBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  bgBtnIcon: { fontSize: 15 },
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
  msgList: { paddingVertical: 8, paddingHorizontal: 4 },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
  },
  templates: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  templateBtn: {
    flex: 1,
    backgroundColor: 'rgba(230,171,44,0.1)',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  templateBtnPressed: { opacity: 0.7 },
  templateText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.gold,
  },
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.white10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
    maxHeight: 120,
    textAlign: 'right',
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
  sendBtnDisabled: { backgroundColor: COLORS.goldDim, opacity: 0.5 },
  sendBtnPressed: { opacity: 0.8 },
  sendIcon: {
    fontSize: 20,
    color: '#000',
    fontFamily: FONTS.bold,
  },
});
