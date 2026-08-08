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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const PAGE_SIZE = 20;

const SUBJECT_LABELS: Record<string, string> = {
  arabic:            'اللغة العربية',
  english:           'اللغة الإنكليزية',
  math:              'الرياضيات',
  science:           'العلوم',
  social_studies:    'الاجتماعيات',
  islamic_education: 'التربية الإسلامية',
};

const EXPO_PUBLIC_APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? '';

type Message = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };
type Session = { id: string; subject: string; title: string | null };

export default function TutorChatSessionScreen() {
  const { profile } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession]               = useState<Session | null>(null);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [hasMore, setHasMore]               = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [body, setBody]                     = useState('');
  const [sending, setSending]               = useState(false);
  const [error, setError]                   = useState('');

  const scrollRef = useRef<ScrollView>(null);

  // Load session + first page of messages
  useEffect(() => {
    if (!profile || !sessionId) return;
    let active = true;

    (async () => {
      const { data: sessionRow } = await supabase
        .from('tutor_chat_sessions')
        .select('id, subject, title')
        .eq('id', sessionId)
        .maybeSingle();

      if (!active) return;
      if (!sessionRow) { router.replace('/(customer)/tutor'); return; }
      setSession(sessionRow as Session);

      const { data: rows } = await supabase
        .from('tutor_messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (!active) return;
      const chrono = ((rows ?? []) as Message[]).slice().reverse();
      setMessages(chrono);
      setHasMore((rows ?? []).length === PAGE_SIZE);
      setInitialLoading(false);
    })();

    return () => { active = false; };
  }, [profile, sessionId]);

  // Auto-scroll on new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleLoadMore() {
    if (!sessionId || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0];
    const { data: older } = await supabase
      .from('tutor_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    setLoadingMore(false);
    setMessages((curr) => [...((older ?? []) as Message[]).slice().reverse(), ...curr]);
    setHasMore((older ?? []).length === PAGE_SIZE);
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending || !sessionId) return;
    setError('');
    setSending(true);
    setBody('');

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`${EXPO_PUBLIC_APP_URL}/api/tutor/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession?.access_token ?? ''}`,
        },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof payload.error === 'string' ? payload.error : 'حدث خطأ');
        setBody(trimmed);
        return;
      }
      setMessages((curr) => [...curr, payload.userMessage, payload.assistantMessage]);
    } catch (err) {
      setError('خطأ في الاتصال');
      setBody(trimmed);
    } finally {
      setSending(false);
    }
  }

  if (!profile || initialLoading) {
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
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          🎓 {SUBJECT_LABELS[session?.subject ?? ''] ?? session?.subject}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled"
      >
        {hasMore && (
          <Pressable style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
            {loadingMore
              ? <ActivityIndicator color={COLORS.gold} size="small" />
              : <Text style={styles.loadMoreText}>تحميل رسائل أقدم</Text>
            }
          </Pressable>
        )}

        {messages.length === 0 && !sending && (
          <Text style={styles.emptyChat}>ابدأ المحادثة بسؤالك الأول!</Text>
        )}

        {messages.map((msg) => {
          const isMine = msg.role === 'user';
          return (
            <View key={msg.id} style={[styles.msgRow, isMine ? styles.msgMine : styles.msgTheirs]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={styles.bubbleText}>{msg.content}</Text>
              </View>
            </View>
          );
        })}

        {sending && (
          <View style={[styles.msgRow, styles.msgTheirs]}>
            <View style={[styles.bubble, styles.bubbleTheirs, styles.thinkingBubble]}>
              <ActivityIndicator color={COLORS.gold} size="small" />
              <Text style={styles.thinkingText}>يفكر...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Error */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="اكتب سؤالك هنا..."
          placeholderTextColor={COLORS.muted}
          multiline
          editable={!sending}
          textAlign="right"
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.75 }, (sending || !body.trim()) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending || !body.trim()}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        ⚠️ المعلم الذكي أداة مساعدة — تحقق دائماً من المعلومات مع معلمك
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },

  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.white10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backBtn:       { padding: 4 },
  backText:      { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white70 },
  headerTitle:   { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: COLORS.gold, textAlign: 'center' },
  headerSpacer:  { width: 28 },

  messageList:    { flex: 1 },
  messageContent: { padding: 16, gap: 10, paddingBottom: 8 },

  loadMoreBtn: {
    alignSelf: 'center',
    backgroundColor: COLORS.white10,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  loadMoreText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white70 },

  emptyChat: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 32,
  },

  msgRow:     { flexDirection: 'row' },
  msgMine:    { justifyContent: 'flex-end' },
  msgTheirs:  { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '80%',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine:    { backgroundColor: 'rgba(230,171,44,0.25)', borderBottomRightRadius: 4 },
  bubbleTheirs:  { backgroundColor: COLORS.bgAlt, borderBottomLeftRadius: 4 },
  bubbleText:    { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },

  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText:   { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

  error: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.red,
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    margin: 12,
    backgroundColor: COLORS.bgAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 18, color: COLORS.bg, fontWeight: '700' },

  disclaimer: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.white40,
    textAlign: 'center',
    marginBottom: 8,
    marginHorizontal: 16,
    lineHeight: 16,
  },
});
