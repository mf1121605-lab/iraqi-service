import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'قيد الانتظار', color: '#f59e0b' },
  in_progress: { label: 'جارٍ المعالجة', color: '#3b82f6' },
  completed:   { label: 'مكتملة',        color: '#22c55e' },
  cancelled:   { label: 'ملغية',         color: '#ef4444' },
};

const CAT_LABELS: Record<string, string> = {
  military:  '🪖 عسكري',
  education: '🎓 دراسي',
  welfare:   '❤️ رعاية',
  general:   '⭐ عام',
};

type RequestItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  customer: { given_name: string; family_name: string; phone: string } | null;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  message_type: string;
  created_at: string;
};

export default function EmployeeDashboard() {
  const { session, profile, signOut } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');

  const loadRequests = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('requests')
      .select('id, title, category, status, created_at, customer:profiles!customer_id(given_name, family_name, phone)')
      .eq('employee_id', session.user.id)
      .in('status', ['pending', 'in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setRequests(data as RequestItem[]);
    setLoadingList(false);
    setRefreshing(false);
  }, [session?.user.id]);

  const loadMessages = useCallback(async (requestId: string) => {
    setLoadingChat(true);
    const { data } = await supabase
      .from('request_messages')
      .select('id, sender_id, body, message_type, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) setMessages(data);
    setLoadingChat(false);
  }, []);

  useEffect(() => {
    loadRequests();
    // Realtime for request list
    const listChannel = supabase
      .channel('employee-requests-mobile')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'requests',
        filter: `employee_id=eq.${session?.user.id}`,
      }, loadRequests)
      .subscribe();
    return () => { supabase.removeChannel(listChannel); };
  }, [loadRequests, session?.user.id]);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    const chatChannel = supabase
      .channel(`emp-chat-${selected.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'request_messages',
        filter: `request_id=eq.${selected.id}`,
      }, () => loadMessages(selected.id))
      .subscribe();
    return () => { supabase.removeChannel(chatChannel); };
  }, [selected, loadMessages]);

  useEffect(() => {
    if (messages.length > 0 && view === 'chat') {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, view]);

  async function markInProgress(req: RequestItem) {
    if (req.status !== 'pending') return;
    await supabase.from('requests').update({ status: 'in_progress' }).eq('id', req.id);
    loadRequests();
  }

  async function markComplete(req: RequestItem) {
    await supabase.from('requests').update({ status: 'completed' }).eq('id', req.id);
    setView('list');
    setSelected(null);
    loadRequests();
  }

  async function sendMessage() {
    if (!text.trim() || !session?.user.id || !selected) return;
    const body = text.trim();
    setText('');
    setSending(true);
    await supabase.from('request_messages').insert({
      request_id: selected.id,
      sender_id: session.user.id,
      body,
      message_type: 'text',
    });
    setSending(false);
  }

  // ──────────────────────────────────────────────────────────────
  // CHAT VIEW
  // ──────────────────────────────────────────────────────────────
  if (view === 'chat' && selected) {
    const customerName = selected.customer
      ? `${selected.customer.given_name} ${selected.customer.family_name}`
      : 'الزبون';
    return (
      <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Chat header */}
          <GoldCard style={styles.chatHeader}>
            <View style={styles.chatHeaderRow}>
              <Pressable style={styles.backBtn} onPress={() => setView('list')}>
                <Text style={styles.backArrow}>→</Text>
              </Pressable>
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatHeaderTitle} numberOfLines={1}>{selected.title}</Text>
                <Text style={styles.chatHeaderSub}>{customerName}</Text>
              </View>
            </View>
            <View style={styles.actionBtns}>
              {selected.status === 'pending' && (
                <GoldButton label="بدء المعالجة" onPress={() => markInProgress(selected)} small />
              )}
              {selected.status === 'in_progress' && (
                <GoldButton label="إنهاء الطلب" onPress={() => markComplete(selected)} small variant="ghost" />
              )}
            </View>
          </GoldCard>

          {loadingChat ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.gold} />
            </View>
          ) : (
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
                  <Text style={styles.emptyChatText}>لا توجد رسائل بعد</Text>
                </View>
              }
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          <View style={styles.inputRow}>
            <Pressable
              style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed, (!text.trim() || sending) && styles.sendBtnDisabled]}
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
            />
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // LIST VIEW
  // ──────────────────────────────────────────────────────────────
  if (loadingList) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  const greeting = profile?.given_name ? `أهلاً، ${profile.given_name}` : 'لوحة الموظف';
  const pending = requests.filter((r) => r.status === 'pending').length;
  const inProgress = requests.filter((r) => r.status === 'in_progress').length;

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} tintColor={COLORS.gold} />}
      >
        {/* Header */}
        <View style={styles.listHeader}>
          <Text style={styles.appName}>خدماتي — موظف</Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <GoldCard style={styles.statCard}>
            <Text style={styles.statNum}>{pending}</Text>
            <Text style={styles.statLabel}>قيد الانتظار</Text>
          </GoldCard>
          <GoldCard style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#3b82f6' }]}>{inProgress}</Text>
            <Text style={styles.statLabel}>جارٍ المعالجة</Text>
          </GoldCard>
          <GoldCard style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#22c55e' }]}>{requests.filter((r) => r.status === 'completed').length}</Text>
            <Text style={styles.statLabel}>مكتملة</Text>
          </GoldCard>
        </View>

        {/* Requests list */}
        <Text style={styles.sectionTitle}>طلبات الزبائن</Text>
        {requests.length === 0 ? (
          <GoldCard style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>لا توجد طلبات معيّنة بعد</Text>
          </GoldCard>
        ) : (
          <View style={styles.list}>
            {requests.map((req) => {
              const st = STATUS_LABELS[req.status] ?? { label: req.status, color: COLORS.muted };
              const customer = req.customer
                ? `${req.customer.given_name} ${req.customer.family_name}`
                : '—';
              return (
                <Pressable
                  key={req.id}
                  style={({ pressed }) => [styles.reqCard, pressed && styles.reqCardPressed]}
                  onPress={() => { setSelected(req); setView('chat'); }}
                >
                  <View style={styles.reqCardTop}>
                    <Text style={styles.reqTitle} numberOfLines={1}>{req.title}</Text>
                    <View style={[styles.badge, { backgroundColor: st.color + '22', borderColor: st.color + '55' }]}>
                      <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <View style={styles.reqCardBottom}>
                    <Text style={styles.reqCat}>{CAT_LABELS[req.category] ?? req.category}</Text>
                    <Text style={styles.reqCustomer}>{customer}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Logout */}
        <GoldButton
          label="تسجيل الخروج"
          onPress={signOut}
          variant="ghost"
          style={styles.logoutBtn}
        />
        <View style={{ height: 24 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14 },
  listHeader: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  appName: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.gold },
  greeting: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statNum: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.gold },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white, textAlign: 'right' },
  list: { gap: 10 },
  reqCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.2)',
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 8,
  },
  reqCardPressed: { opacity: 0.7 },
  reqCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  reqTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: FONTS.bold, fontSize: 11 },
  reqCardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  reqCat: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gold },
  reqCustomer: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  logoutBtn: { marginTop: 8 },
  // Chat styles
  chatHeader: { margin: 12, gap: 10 },
  chatHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 6 },
  backArrow: { fontSize: 22, color: COLORS.gold },
  chatHeaderInfo: { flex: 1, gap: 2 },
  chatHeaderTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, textAlign: 'right' },
  chatHeaderSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  actionBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
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
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: '#000' },
});
