import { useEffect, useRef, useState } from 'react';
import {
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
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Avatar } from '@/components/chat/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

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
  created_at: string;
  message_type: string | null;
}

function displayNameFor(p: OtherUser | null): string {
  if (!p) return 'عضو';
  return [p.given_name, p.family_name].filter(Boolean).join(' ') || 'عضو';
}

const TEMPLATES = {
  welcome:      'أهلاً وسهلاً! أنا مستعد لمساعدتك. كيف يمكنني خدمتك؟',
  requirements: 'لإتمام طلبك، نحتاج المستندات التالية:',
  payment:      'رسوم الخدمة هي: [المبلغ]. يمكنك الدفع عبر:',
};

export default function DmThread() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { profile, loading } = useAuth();

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!profile || !threadId) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function loadMessages() {
      supabase
        .from('direct_messages')
        .select('id, sender_id, body, attachment_url, created_at, message_type')
        .eq('thread_id', threadId)
        .order('created_at')
        .then(({ data }) => {
          if (active) setMessages(data ?? []);
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
        .subscribe();
    }

    init();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [profile?.id, threadId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  async function handleSend() {
    const text = body.trim();
    if (!text || !profile || !threadId) return;
    setSending(true);
    setBody('');
    await supabase.from('direct_messages').insert({
      thread_id: threadId,
      sender_id: profile.id,
      body: text,
    });
    setSending(false);
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backArrow}>‹</Text>
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
          <Text style={styles.headerSub}>محادثة خاصة</Text>
        </View>
      </View>

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
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === profile!.id;
            const prev = messages[index - 1];
            const bundled = prev && prev.sender_id === item.sender_id &&
              new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() < 120_000;
            return (
              <MessageBubble
                body={item.body ?? ''}
                isMine={isMine}
                timestamp={item.created_at}
                messageType={item.message_type ?? undefined}
                bundled={!!bundled}
              />
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

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="اكتب رسالة..."
            placeholderTextColor={COLORS.white40}
            style={styles.input}
            multiline
            textAlign="right"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !body.trim()}
            style={({ pressed }) => [styles.sendBtn, (sending || !body.trim()) && styles.sendBtnDisabled, pressed && styles.sendBtnPressed]}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        </View>
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
