import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageReactionPopover } from '@/components/chat/MessageReactionPopover';
import { OrderAlertCard } from '@/components/chat/OrderAlertCard';
import { HqLinksBox } from '@/components/chat/HqLinksBox';
import { VoiceRecorderBar } from '@/components/chat/VoiceRecorderBar';
import { ChatBackgroundLayer } from '@/components/chat/ChatBackgroundLayer';
import { ChatBackgroundPicker } from '@/components/chat/ChatBackgroundPicker';
import { TwemojiSticker } from '@/components/chat/TwemojiSticker';
import { AnimatedGoldBorder } from '@/components/ui/AnimatedGoldBorder';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { playSound } from '@/utils/soundFX';
import { ChatBgTheme, getChatBgTheme, setChatBgTheme, themeForRoomSlug } from '@/utils/chatBackgroundPrefs';

const TYPING_TIMEOUT_MS = 3000;
const TYPING_BROADCAST_INTERVAL_MS = 2000;

interface ChatRoom {
  id: string;
  slug: string;
  name_ar: string;
  name_ckb: string | null;
  icon_url: string | null;
  moderator_id: string | null;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_display_name: string | null;
  sender_avatar_key: string | null;
  sender_role: string | null;
  body: string | null;
  attachment_url: string | null;
  reply_to_id: string | null;
  is_hidden: boolean;
  is_pinned: boolean;
  message_type: string | null;
  created_at: string;
}

interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

interface TypingMap {
  [userId: string]: { name: string; ts: number };
}

function displayNameFor(profile: { given_name?: string | null; family_name?: string | null } | null): string {
  if (!profile) return '';
  return [profile.given_name, profile.family_name].filter(Boolean).join(' ') || 'عضو';
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

const STICKER_PACKS = {
  academic: ['📚', '✏️', '🎓', '📝', '🏫', '📖', '🔬', '📐'],
  official: ['📋', '🗂️', '🏛️', '⚖️', '🔖', '📌', '🗃️', '🖊️'],
  expressive: ['😊', '👍', '❤️', '🙏', '✅', '🌟', '💪', '🎉'],
};

export default function ChatRoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { profile, loading } = useAuth();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingMap>({});
  const [onlineCount, setOnlineCount] = useState(0);
  const [bgTheme, setBgTheme] = useState<ChatBgTheme>('none');
  const [showBgPicker, setShowBgPicker] = useState(false);

  // Each room gets a distinct default animated background derived from its
  // slug, so community rooms feel visually different from one another even
  // before a member picks a theme manually via the palette icon.
  useEffect(() => {
    getChatBgTheme().then((stored) => setBgTheme(stored === 'none' && slug ? themeForRoomSlug(slug) : stored));
  }, [slug]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [activeStickerPack, setActiveStickerPack] = useState<keyof typeof STICKER_PACKS>('expressive');
  const [bannedFromRoom, setBannedFromRoom] = useState(false);
  const [recording, setRecording] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);

  const listRef = useRef<FlatList>(null);
  const lastTypingBroadcast = useRef(0);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const isStaff = profile?.role === 'founder' || profile?.role === 'employee';

  // Load room and subscribe to realtime
  useEffect(() => {
    if (!profile || !slug) return;
    let active = true;

    async function init() {
      // Load room
      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select('id, slug, name_ar, name_ckb, icon_url, moderator_id')
        .eq('slug', slug)
        .maybeSingle();

      if (!active) return;
      if (!roomData) { setNotFound(true); setInitializing(false); return; }
      setRoom(roomData);

      // Check ban
      const { data: banRow } = await supabase
        .from('chat_room_bans')
        .select('id')
        .eq('room_id', roomData.id)
        .eq('banned_user_id', profile!.id)
        .maybeSingle();
      if (!active) return;
      if (banRow) { setBannedFromRoom(true); setInitializing(false); return; }

      // Load messages
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, sender_id, sender_display_name, sender_avatar_key, sender_role, body, attachment_url, reply_to_id, is_hidden, is_pinned, message_type, created_at')
        .eq('room_id', roomData.id)
        .eq('is_hidden', false)
        .order('created_at')
        .limit(100);
      if (active) setMessages(msgs ?? []);

      // Load reactions
      const { data: rxns } = await supabase
        .from('chat_message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', (msgs ?? []).map((m: ChatMessage) => m.id));
      if (active) setReactions(rxns ?? []);

      setInitializing(false);

      // Realtime channel
      const channel = supabase.channel(`chat-room-${roomData.id}`, {
        config: { broadcast: { self: false }, presence: { key: profile!.id } },
      });

      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomData.id}`,
        }, (payload) => {
          if (!payload.new.is_hidden) {
            setMessages(prev => [...prev, payload.new as ChatMessage]);
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomData.id}`,
        }, (payload) => {
          const updated = payload.new as ChatMessage;
          if (updated.is_hidden) {
            setMessages(prev => prev.filter(m => m.id !== updated.id));
          } else {
            setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_message_reactions',
        }, async () => {
          const { data: rxns } = await supabase
            .from('chat_message_reactions')
            .select('message_id, user_id, emoji')
            .in('message_id', messagesRef.current.map(m => m.id));
          if (active) setReactions(rxns ?? []);
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          const { userId, name } = payload.payload as { userId: string; name: string };
          if (userId === profile!.id) return;

          // Only chime the first time this user starts typing, not on
          // every refresh broadcast while they keep typing.
          if (!typingTimers.current[userId]) playSound('typing');

          setTypingUsers(prev => ({ ...prev, [userId]: { name, ts: Date.now() } }));

          if (typingTimers.current[userId]) clearTimeout(typingTimers.current[userId]);
          typingTimers.current[userId] = setTimeout(() => {
            setTypingUsers(prev => {
              const next = { ...prev };
              delete next[userId];
              return next;
            });
          }, TYPING_TIMEOUT_MS);
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setOnlineCount(Object.keys(state).length);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: profile!.id, name: displayNameFor(profile!) });
          }
        });

      channelRef.current = channel;
    }

    init();

    return () => {
      active = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(typingTimers.current).forEach(clearTimeout);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // Deliberately depends on the stable id, not the whole profile object —
    // reconnecting this realtime channel on every unrelated profile field
    // change would be wasteful (same convention throughout this codebase).
    // typingTimers.current is read only for its side effect at cleanup time,
    // not to derive render output, so a stale ref value here is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, slug]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !profile) return;
    const now = Date.now();
    if (now - lastTypingBroadcast.current < TYPING_BROADCAST_INTERVAL_MS) return;
    lastTypingBroadcast.current = now;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: profile.id, name: displayNameFor(profile) },
    });
  }, [profile]);

  async function handleSend() {
    const text = body.trim();
    if (!text || !room || !profile || bannedFromRoom) return;
    setSending(true);
    setBody('');
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    await supabase.from('chat_messages').insert({
      room_id: room.id,
      sender_id: profile.id,
      sender_display_name: displayNameFor(profile),
      sender_avatar_key: profile.avatar_key,
      sender_role: profile.role,
      body: text,
      message_type: 'text',
      reply_to_id: replyId,
    });
    playSound('messageSent');
    setSending(false);
  }

  async function handleSendSticker(sticker: string) {
    if (!room || !profile) return;
    setShowStickerPicker(false);
    await supabase.from('chat_messages').insert({
      room_id: room.id,
      sender_id: profile.id,
      sender_display_name: displayNameFor(profile),
      sender_avatar_key: profile.avatar_key,
      sender_role: profile.role,
      body: sticker,
      message_type: 'sticker',
    });
  }

  async function pickAndSendImage() {
    if (!room || !profile) return;
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
      await supabase.from('chat_messages').insert({
        room_id: room.id, sender_id: profile.id,
        sender_display_name: displayNameFor(profile), sender_avatar_key: profile.avatar_key, sender_role: profile.role,
        body: isVideo ? '🎬 فيديو' : '📷 صورة', message_type: isVideo ? 'video' : 'image', attachment_url: url, reply_to_id: replyTo?.id ?? null,
      });
      setReplyTo(null);
    } else {
      Alert.alert('تعذّر الإرسال', 'حدث خطأ أثناء رفع المرفق، حاول مرة أخرى.');
    }
    setSending(false);
  }

  async function sendVoice(uri: string, durationMs: number) {
    if (!room || !profile) return;
    setRecording(false);
    if (durationMs < 800) return;
    setSending(true);
    const url = await uploadAttachment(uri, profile.id, 'voice');
    if (url) {
      await supabase.from('chat_messages').insert({
        room_id: room.id, sender_id: profile.id,
        sender_display_name: displayNameFor(profile), sender_avatar_key: profile.avatar_key, sender_role: profile.role,
        body: '🎤 رسالة صوتية', message_type: 'voice', attachment_url: url,
      });
    } else {
      Alert.alert('تعذّر الإرسال', 'حدث خطأ أثناء رفع الرسالة الصوتية، حاول مرة أخرى.');
    }
    setSending(false);
  }

  async function handleHideMessage(messageId: string) {
    await supabase.from('chat_messages').update({ is_hidden: true }).eq('id', messageId);
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!profile) return;
    setReactingId(null);
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === profile.id);
    if (existing) {
      await supabase.from('chat_message_reactions').delete()
        .eq('message_id', messageId).eq('user_id', profile.id);
      if (existing.emoji === emoji) return;
    }
    await supabase.from('chat_message_reactions').insert({ message_id: messageId, user_id: profile.id, emoji });
    playSound('reaction');
  }

  const typingNames = Object.values(typingUsers).map(u => u.name);
  const canModerate = (msg: ChatMessage) =>
    isStaff || room?.moderator_id === profile?.id || msg.sender_id === profile?.id;

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
          <Text style={styles.emptyText}>الغرفة غير موجودة</Text>
        </View>
      </ScreenBg>
    );
  }

  if (bannedFromRoom) {
    return (
      <ScreenBg>
        <View style={styles.center}>
          <Text style={styles.bannedText}>أنت محظور من هذه الغرفة</Text>
        </View>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
      <AnimatedGoldBorder borderRadius={0} borderWidth={2} innerBg="transparent" style={styles.roomFrame} innerStyle={styles.roomFrameInner}>
      <ChatBackgroundLayer theme={bgTheme} />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.roomIconWrap}>
          <Text style={styles.roomIconText}>💬</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {room?.name_ar ?? ''}
          </Text>
          <Text style={styles.headerSub}>
            {onlineCount > 0 ? `${onlineCount} متصل` : 'غرفة مجتمعية'}
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
      {room?.slug === 'hq' && <HqLinksBox />}

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
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === profile!.id;
            const prev = messages[index - 1];
            const bundled = prev && prev.sender_id === item.sender_id &&
              new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() < 120_000;
            const msgReactions = reactions.filter(r => r.message_id === item.id);
            const reactionCounts: Record<string, number> = {};
            msgReactions.forEach(r => { reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1; });
            const replySource = item.reply_to_id ? messages.find(m => m.id === item.reply_to_id) : null;

            if (item.message_type === 'order_alert') {
              return <OrderAlertCard key={item.id} body={item.body ?? ''} />;
            }

            return (
              <View>
                {reactingId === item.id && (
                  <MessageReactionPopover
                    align={isMine ? 'end' : 'start'}
                    onPick={(emoji) => toggleReaction(item.id, emoji)}
                    onReply={() => { setReplyTo(item); setReactingId(null); }}
                  />
                )}
                <MessageBubble
                  body={item.body ?? ''}
                  isMine={isMine}
                  senderName={!isMine && !bundled ? (item.sender_display_name ?? '') : undefined}
                  senderAvatarKey={!isMine ? item.sender_avatar_key : undefined}
                  onSenderPress={!isMine ? () => router.push({ pathname: '/user/[userId]', params: { userId: item.sender_id } }) : undefined}
                  timestamp={item.created_at}
                  messageType={item.message_type ?? undefined}
                  attachmentUrl={item.attachment_url}
                  attachmentType={
                    item.message_type === 'image' ? 'image' :
                    item.message_type === 'voice' ? 'voice' :
                    item.message_type === 'video' ? 'video' : null
                  }
                  reactions={Object.entries(reactionCounts).map(([emoji, count]) => ({ emoji, count, mine: false }))}
                  replyTo={replySource ? { body: replySource.body ?? '', senderName: replySource.sender_display_name ?? undefined } : null}
                  bundled={!!bundled}
                  onLongPress={() => setReactingId(reactingId === item.id ? null : item.id)}
                />
                {/* Reply / moderation row */}
                <View style={[styles.msgActions, isMine ? styles.msgActionsRight : styles.msgActionsLeft]}>
                  <Pressable onPress={() => setReplyTo(item)} style={styles.replyActionBtn}>
                    <Text style={styles.replyActionText}>↩ رد</Text>
                  </Pressable>
                  {canModerate(item) && (
                    <Pressable onPress={() => handleHideMessage(item.id)} style={styles.hideBtn}>
                      <Text style={styles.hideBtnText}>✕</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>لا توجد رسائل بعد — كن أول من يكتب!</Text>
            </View>
          }
        />

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>
              {typingNames.slice(0, 2).join('، ')} يكتب...
            </Text>
          </View>
        )}

        {/* Sticker picker */}
        {showStickerPicker && (
          <View style={styles.stickerPanel}>
            {/* Pack tabs */}
            <View style={styles.stickerTabs}>
              {(Object.keys(STICKER_PACKS) as Array<keyof typeof STICKER_PACKS>).map(pack => (
                <Pressable
                  key={pack}
                  style={[styles.stickerTab, activeStickerPack === pack && styles.stickerTabActive]}
                  onPress={() => setActiveStickerPack(pack)}
                >
                  <Text style={styles.stickerTabText}>
                    {pack === 'academic' ? 'أكاديمي' : pack === 'official' ? 'رسمي' : 'تعبيري'}
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowStickerPicker(false)} style={styles.stickerClose}>
                <Text style={styles.stickerCloseText}>✕</Text>
              </Pressable>
            </View>
            {/* Sticker grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerGrid}>
              {STICKER_PACKS[activeStickerPack].map(sticker => (
                <Pressable key={sticker} onPress={() => handleSendSticker(sticker)} style={styles.stickerItem}>
                  <TwemojiSticker emoji={sticker} size={36} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reply preview */}
        {replyTo && (
          <View style={styles.replyBar}>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Text style={styles.replyBarClose}>✕</Text>
            </Pressable>
            <Text style={styles.replyBarText} numberOfLines={1}>
              الرد على {replyTo.sender_display_name}: {replyTo.body}
            </Text>
          </View>
        )}

        {/* Input bar */}
        {bannedFromRoom ? (
          <View style={styles.bannedBar}>
            <Text style={styles.bannedBarText}>أنت محظور ولا يمكنك الكتابة</Text>
          </View>
        ) : recording ? (
          <VoiceRecorderBar onSend={sendVoice} onCancel={() => setRecording(false)} />
        ) : (
          <View style={styles.inputRow}>
            <Pressable
              onPress={() => setShowStickerPicker(v => !v)}
              style={styles.stickerToggle}
              hitSlop={6}
            >
              <TwemojiSticker emoji="😊" size={24} />
            </Pressable>
            <TextInput
              value={body}
              onChangeText={text => { setBody(text); broadcastTyping(); }}
              placeholder="اكتب رسالة..."
              placeholderTextColor={COLORS.white40}
              style={styles.input}
              multiline
              textAlign="right"
              onSubmitEditing={handleSend}
            />
            <Pressable style={styles.mediaBtn} onPress={pickAndSendImage} disabled={sending}>
              <Text style={styles.mediaBtnIcon}>🖼️</Text>
            </Pressable>
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
          </View>
        )}
      </KeyboardAvoidingView>
      </AnimatedGoldBorder>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  roomFrame: { flex: 1 },
  roomFrameInner: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  roomIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(230,171,44,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomIconText: { fontSize: 18 },
  headerInfo: { flex: 1 },
  headerName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
    textAlign: 'right',
  },
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
  bgBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  bgBtnIcon: { fontSize: 15 },
  msgList: { paddingVertical: 8, paddingHorizontal: 4, gap: 2 },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
  },
  bannedText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.red,
    textAlign: 'center',
  },
  msgActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 2,
    marginBottom: 6,
  },
  msgActionsRight: { justifyContent: 'flex-end' },
  msgActionsLeft: { justifyContent: 'flex-start' },
  replyActionBtn: { paddingHorizontal: 4 },
  replyActionText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  hideBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hideBtnText: { fontSize: 10, color: COLORS.red },
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  stickerPanel: {
    backgroundColor: COLORS.bgAlt,
    borderTopWidth: 1,
    borderTopColor: COLORS.white10,
  },
  stickerTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 6,
  },
  stickerTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  stickerTabActive: {
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
  },
  stickerTabText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
  },
  stickerClose: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerCloseText: { fontSize: 14, color: COLORS.white40 },
  stickerGrid: { padding: 12, gap: 8 },
  stickerItem: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmoji: { fontSize: 32 },
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
  stickerToggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerToggleText: { fontSize: 24 },
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
  mediaBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  mediaBtnIcon: { fontSize: 17 },
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
  sendIcon: { fontSize: 20, color: '#000', fontFamily: FONTS.bold },
  bannedBar: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  bannedBarText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.red,
  },
});
