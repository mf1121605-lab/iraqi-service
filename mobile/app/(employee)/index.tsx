import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:     { label: 'قيد الانتظار', color: '#f59e0b' },
  in_progress: { label: 'جارٍ المعالجة', color: '#3b82f6' },
  completed:   { label: 'مكتملة',        color: '#22c55e' },
  cancelled:   { label: 'ملغية',         color: '#ef4444' },
};

const CAT_META: Record<string, { label: string; emoji: string; accent: string }> = {
  military:  { label: 'عسكري',   emoji: '🪖', accent: '#7da9cc' },
  education: { label: 'دراسي',    emoji: '🎓', accent: '#4f8bff' },
  welfare:   { label: 'رعاية',    emoji: '❤️', accent: '#e14b6a' },
  general:   { label: 'عام',      emoji: '⭐', accent: '#e6ab2c' },
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

function StatCard({ value, label, color, emoji }: { value: number; label: string; color: string; emoji: string }) {
  return (
    <View style={[statStyles.card, { borderColor: color + '30' }]}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  emoji: { fontSize: 22 },
  value: { fontFamily: 'Cairo_700Bold', fontSize: 26 },
  label: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: COLORS.muted, textAlign: 'center' },
});

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
    if (data) setRequests(data as unknown as RequestItem[]);
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
    const listChannel = supabase
      .channel('employee-requests-mobile')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'requests',
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
        event: '*', schema: 'public', table: 'request_messages',
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
    await supabase.from('requests').update({ status: 'in_progress' }).eq('id', req.id);
    setSelected((prev) => prev ? { ...prev, status: 'in_progress' } : prev);
    loadRequests();
  }

  async function markComplete(req: RequestItem) {
    Alert.alert('إنهاء الطلب', 'هل تأكدت من إتمام جميع متطلبات الطلب؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إنهاء',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('requests').update({ status: 'completed' }).eq('id', req.id);
          setView('list');
          setSelected(null);
          loadRequests();
        },
      },
    ]);
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

  // ── CHAT VIEW ───────────────────────────────────────────────────
  if (view === 'chat' && selected) {
    const customerName = selected.customer
      ? `${selected.customer.given_name} ${selected.customer.family_name}`
      : 'الزبون';
    const st = STATUS_META[selected.status] ?? { label: selected.status, color: COLORS.muted };
    const isClosed = selected.status === 'completed' || selected.status === 'cancelled';

    return (
      <ScreenBg noTopPad>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Chat nav header */}
          <View style={styles.chatNavHeader}>
            <Pressable onPress={() => setView('list')} style={styles.backBtn} hitSlop={12}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <View style={styles.chatNavCenter}>
              <Text style={styles.chatNavTitle} numberOfLines={1}>{selected.title}</Text>
              <View style={styles.chatNavMeta}>
                <View style={[styles.statusPill, { backgroundColor: st.color + '20', borderColor: st.color + '50' }]}>
                  <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                  <Text style={[styles.statusPillText, { color: st.color }]}>{st.label}</Text>
                </View>
                <Text style={styles.chatCustomerName}>👤 {customerName}</Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          {!isClosed && (
            <View style={styles.actionBar}>
              {selected.status === 'pending' && (
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && { opacity: 0.8 }]}
                  onPress={() => markInProgress(selected)}
                >
                  <Text style={styles.actionBtnPrimaryText}>▶ بدء المعالجة</Text>
                </Pressable>
              )}
              {selected.status === 'in_progress' && (
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, styles.actionBtnComplete, pressed && { opacity: 0.8 }]}
                  onPress={() => markComplete(selected)}
                >
                  <Text style={styles.actionBtnCompleteText}>✓ إنهاء الطلب</Text>
                </Pressable>
              )}
            </View>
          )}

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
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isMine = item.sender_id === session?.user.id;
                const prev = messages[index - 1];
                const bundled = !!(prev && prev.sender_id === item.sender_id &&
                  new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() < 60000);
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
                  <Text style={styles.emptyChatEmoji}>💬</Text>
                  <Text style={styles.emptyChatText}>لا توجد رسائل بعد</Text>
                </View>
              }
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {!isClosed ? (
            <View style={styles.inputBar}>
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!text.trim() || sending) && styles.sendBtnDisabled,
                  pressed && styles.sendBtnPressed,
                ]}
                onPress={sendMessage}
                disabled={sending || !text.trim()}
              >
                {sending ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.sendIcon}>↑</Text>
                )}
              </Pressable>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="اكتب رسالة للزبون..."
                placeholderTextColor={COLORS.white40}
                style={styles.textInput}
                textAlign="right"
                multiline
                maxLength={2000}
              />
            </View>
          ) : (
            <View style={styles.closedBar}>
              <Text style={styles.closedBarText}>
                {selected.status === 'completed' ? '✅ تم إنجاز الطلب' : '❌ تم إلغاء الطلب'}
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </ScreenBg>
    );
  }

  // ── LIST VIEW ───────────────────────────────────────────────────
  if (loadingList) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  const fullName = [profile?.given_name, profile?.family_name].filter(Boolean).join(' ') || 'الموظف';
  const pending = requests.filter((r) => r.status === 'pending').length;
  const inProgress = requests.filter((r) => r.status === 'in_progress').length;
  const completed = requests.filter((r) => r.status === 'completed').length;
  const activeCount = pending + inProgress;

  return (
    <ScreenBg noTopPad>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRequests(); }}
            tintColor={COLORS.gold}
          />
        }
      >
        {/* Header */}
        <View style={styles.listHeader}>
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.logoutIconBtn}
              onPress={() => signOut()}
              hitSlop={8}
            >
              <Text style={styles.logoutIconText}>🚪</Text>
            </Pressable>
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.employeeBadgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>موظف</Text>
              </View>
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>موثّق ✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.empName}>{fullName}</Text>
            {activeCount > 0 && (
              <Text style={styles.activeHint}>{activeCount} طلب نشط</Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard value={pending}    label="انتظار"   color="#f59e0b" emoji="⏳" />
          <StatCard value={inProgress} label="معالجة"   color="#3b82f6" emoji="⚡" />
          <StatCard value={completed}  label="مكتملة"   color="#22c55e" emoji="✅" />
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>طلبات الزبائن</Text>
          <Text style={styles.sectionIcon}>📋</Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>لا توجد طلبات معيّنة بعد</Text>
            <Text style={styles.emptySub}>ستظهر هنا الطلبات المُعيَّنة إليك</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((req) => {
              const st = STATUS_META[req.status] ?? { label: req.status, color: COLORS.muted };
              const cat = CAT_META[req.category] ?? { label: req.category, emoji: '📁', accent: COLORS.gold };
              const customerName = req.customer
                ? `${req.customer.given_name} ${req.customer.family_name}`
                : '—';
              return (
                <Pressable
                  key={req.id}
                  style={({ pressed }) => [styles.reqCard, pressed && styles.reqCardPressed]}
                  onPress={() => { setSelected(req); setView('chat'); }}
                >
                  {/* Status accent bar */}
                  <View style={[styles.accentBar, { backgroundColor: st.color }]} />
                  <View style={styles.reqCardInner}>
                    <View style={styles.reqCardTop}>
                      <View style={[styles.statusPill, { backgroundColor: st.color + '20', borderColor: st.color + '50' }]}>
                        <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                        <Text style={[styles.statusPillText, { color: st.color }]}>{st.label}</Text>
                      </View>
                      <Text style={styles.reqTitle} numberOfLines={1}>{req.title}</Text>
                    </View>
                    <View style={styles.reqCardBottom}>
                      <View style={styles.customerChip}>
                        <Text style={styles.customerChipText}>{customerName}</Text>
                        <Text style={styles.customerIcon}>👤</Text>
                      </View>
                      <View style={styles.catChip}>
                        <Text style={styles.catLabel}>{cat.label}</Text>
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16 },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLeft: { width: 40 },
  logoutIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  logoutIconText: { fontSize: 22 },
  headerCenter: { alignItems: 'center', gap: 4 },
  employeeBadgeRow: { flexDirection: 'row', gap: 6 },
  roleBadge: {
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  verifiedBadge: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 11, color: '#3b82f6' },
  empName: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white },
  activeHint: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },

  statsRow: { flexDirection: 'row', gap: 10 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.gold },
  sectionIcon: { fontSize: 16 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
    backgroundColor: '#161b22',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 24,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  emptySub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  list: { gap: 10 },
  reqCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  reqCardPressed: { opacity: 0.75 },
  accentBar: { width: 4 },
  reqCardInner: { flex: 1, padding: 14, gap: 8 },
  reqCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  reqTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontFamily: FONTS.bold, fontSize: 10 },
  reqCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customerChipText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  customerIcon: { fontSize: 12 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catEmoji: { fontSize: 13 },
  catLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white40 },

  // Chat view
  chatNavHeader: {
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
  chatNavCenter: { flex: 1, gap: 4, alignItems: 'flex-end' },
  chatNavTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  chatNavMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatCustomerName: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },

  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0d1117',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  actionBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  actionBtnPrimary: {
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderColor: 'rgba(230,171,44,0.4)',
  },
  actionBtnPrimaryText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  actionBtnComplete: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.35)',
  },
  actionBtnCompleteText: { fontFamily: FONTS.bold, fontSize: 13, color: '#22c55e' },

  msgList: { padding: 12, paddingBottom: 8 },
  emptyChat: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyChatEmoji: { fontSize: 40 },
  emptyChatText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

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
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
    maxHeight: 120,
    minHeight: 44,
  },
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
});
