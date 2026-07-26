import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { GoldCard } from '@/components/ui/GoldCard';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'قيد الانتظار', color: '#f59e0b' },
  in_progress: { label: 'جارٍ المعالجة', color: '#3b82f6' },
  completed:   { label: 'مكتملة',        color: '#22c55e' },
  cancelled:   { label: 'ملغية',         color: '#ef4444' },
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  message_type: string;
  created_at: string;
};

type RequestDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  employee_id: string | null;
  employee: { given_name: string; family_name: string } | null;
};

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [req, setReq] = useState<RequestDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [rRes, mRes] = await Promise.all([
      supabase
        .from('requests')
        .select('id, title, description, category, status, created_at, employee_id, employee:profiles!employee_id(given_name, family_name)')
        .eq('id', id)
        .single(),
      supabase
        .from('request_messages')
        .select('id, sender_id, body, message_type, created_at')
        .eq('request_id', id)
        .order('created_at', { ascending: true })
        .limit(200),
    ]);
    if (rRes.data) setReq(rRes.data as RequestDetail);
    if (mRes.data) setMessages(mRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
    // Realtime subscription
    const channel = supabase
      .channel(`request-detail-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'request_messages',
        filter: `request_id=eq.${id}`,
      }, () => loadData())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requests',
        filter: `id=eq.${id}`,
      }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, loadData]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function sendMessage() {
    if (!text.trim() || !session?.user.id || !id) return;
    const body = text.trim();
    setText('');
    setSending(true);
    await supabase.from('request_messages').insert({
      request_id: id,
      sender_id: session.user.id,
      body,
      message_type: 'text',
    });
    setSending(false);
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

  const st = STATUS_LABELS[req.status] ?? { label: req.status, color: COLORS.muted };
  const employeeName = req.employee
    ? `${req.employee.given_name} ${req.employee.family_name}`
    : 'لم يُعيَّن بعد';

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Request info header */}
        <GoldCard style={styles.reqHeader}>
          <View style={styles.reqHeaderRow}>
            <Text style={styles.reqTitle} numberOfLines={1}>{req.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: st.color + '22', borderColor: st.color + '55' }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
          <Text style={styles.employeeRow}>
            الموظف المسؤول: <Text style={styles.employeeName}>{employeeName}</Text>
          </Text>
        </GoldCard>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === session?.user.id;
            const prev = messages[index - 1];
            const bundled = prev && prev.sender_id === item.sender_id &&
              new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() < 60000;
            return (
              <MessageBubble
                isMine={isMine}
                body={item.body}
                messageType={item.message_type}
                timestamp={item.created_at}
                bundled={bundled}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>ابدأ المحادثة مع الموظف</Text>
            </View>
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Message input */}
        {req.status !== 'completed' && req.status !== 'cancelled' && (
          <View style={styles.inputRow}>
            <Pressable
              style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}
              onPress={sendMessage}
              disabled={sending || !text.trim()}
            >
              <Text style={styles.sendBtnText}>←</Text>
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="اكتب رسالة..."
              placeholderTextColor={COLORS.white40}
              style={styles.textInput}
              textAlign="right"
              multiline
              maxLength={2000}
              onSubmitEditing={sendMessage}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.muted },
  reqHeader: {
    margin: 12,
    marginBottom: 4,
    gap: 6,
  },
  reqHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  reqTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, flex: 1, textAlign: 'right' },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },
  employeeRow: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  employeeName: { fontFamily: FONTS.bold, color: COLORS.gold },
  msgList: { padding: 12, gap: 4 },
  emptyChat: { alignItems: 'center', paddingVertical: 40 },
  emptyChatText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230,171,44,0.15)',
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnPressed: { opacity: 0.7 },
  sendBtnText: { fontSize: 20, color: '#000' },
});
