import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const PAGE_SIZE = 30;

type Message = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  sender?: { given_name: string; family_name: string };
};

type Room = { id: string; name: string; slug: string };

export default function CommunityRoomScreen() {
  const { profile } = useAuth();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  const [room, setRoom]       = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody]       = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<ScrollView>(null);

  // Load room + messages
  useEffect(() => {
    if (!profile || !roomId) return;
    let active = true;

    (async () => {
      const { data: roomRow } = await supabase
        .from('chat_rooms')
        .select('id, name, slug')
        .eq('id', roomId)
        .maybeSingle();

      if (!active || !roomRow) { router.replace('/(customer)/communities'); return; }
      setRoom(roomRow as Room);

      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, body, sender_id, created_at, sender:profiles(given_name, family_name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (!active) return;
      const normalized = (msgs ?? []).map((m: any) => ({
        ...m,
        sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
      })) as Message[];
      setMessages(normalized.slice().reverse());
      setLoading(false);
    })();

    return () => { active = false; };
  }, [profile, roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`community-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as Message;
          // Fetch sender name
          supabase
            .from('profiles')
            .select('given_name, family_name')
            .eq('id', msg.sender_id)
            .maybeSingle()
            .then(({ data }) => {
              setMessages((curr) => [...curr, { ...msg, sender: data ?? undefined }]);
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
            });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Auto-scroll when messages load
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [loading]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending || !roomId || !profile) return;
    setSending(true);
    setBody('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: profile.id,
      body: trimmed,
      message_type: 'text',
    });

    setSending(false);
  }

  function senderName(msg: Message) {
    if (!msg.sender) return '...';
    return `${msg.sender.given_name} ${msg.sender.family_name}`.trim() || 'مجهول';
  }

  const isMine = (msg: Message) => msg.sender_id === profile?.id;

  if (!profile || loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </Pressable>
        <Text style={styles.roomName} numberOfLines={1}>
          🏘️ {room?.name ?? '...'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <Text style={styles.emptyText}>كن أول من يبدأ النقاش!</Text>
        )}
        {messages.map((msg, idx) => {
          const mine = isMine(msg);
          const prev = messages[idx - 1];
          const showName = !mine && (!prev || prev.sender_id !== msg.sender_id);
          return (
            <View key={msg.id} style={[styles.msgRow, mine ? styles.rowMine : styles.rowTheirs]}>
              <View>
                {showName && (
                  <Text style={styles.senderName}>{senderName(msg)}</Text>
                )}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={styles.msgText}>{msg.body}</Text>
                  <Text style={styles.msgTime}>
                    {new Date(msg.created_at).toLocaleTimeString('ar', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'Asia/Baghdad',
                    })}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="اكتب رسالتك..."
          placeholderTextColor={COLORS.muted}
          multiline
          editable={!sending}
          textAlign="right"
        />
        <Pressable
          style={[styles.sendBtn, (!body.trim() || sending) && styles.sendBtnOff]}
          onPress={handleSend}
          disabled={!body.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color={COLORS.bg} size="small" />
            : <Text style={styles.sendIcon}>↑</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: COLORS.bg },
  loadingScreen:{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.white10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backBtn:  { padding: 4 },
  backText: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white70 },
  roomName: { flex: 1, fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'center' },

  list:        { flex: 1 },
  listContent: { padding: 16, gap: 4, paddingBottom: 8 },

  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 40,
  },

  msgRow:    { flexDirection: 'row', marginVertical: 2 },
  rowMine:   { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },

  senderName: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.gold,
    marginBottom: 3,
    textAlign: 'right',
  },

  bubble: {
    maxWidth: 260,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine:   { backgroundColor: 'rgba(230,171,44,0.22)', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.bgAlt, borderBottomLeftRadius: 4 },

  msgText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white, lineHeight: 22 },
  msgTime: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.muted, textAlign: 'right', marginTop: 3 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    margin: 12,
    backgroundColor: COLORS.bgAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
    maxHeight: 100,
    paddingVertical: 4,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.38 },
  sendIcon:   { fontSize: 18, color: COLORS.bg, fontWeight: '700' },
});
