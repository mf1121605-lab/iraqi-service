import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { Avatar } from '@/components/chat/Avatar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenView = 'list' | 'chat' | 'profile';
type QueueTab = 'requests' | 'quick';

interface RequestItem {
  id: string;
  title: string;
  category: string;
  status: string;
  assigned_employee_id: string | null;
  customer_id: string;
  created_at: string;
}

interface QuickRequest {
  id: string;
  section_name: string;
  content: string;
  status: string;
  created_at: string;
  customer: { id: string; given_name: string | null; family_name: string | null; phone: string | null } | null;
}

interface Message {
  id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  message_type: string | null;
  created_at: string;
  read_at: string | null;
}

interface HistoryEntry {
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}

interface Category {
  key: string;
  name_ar: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending:       'قيد الانتظار',
  in_progress:   'قيد المعالجة',
  in_review:     'تحت المراجعة',
  needs_changes: 'يحتاج تعديلات',
  approved:      'موافق عليه',
  rejected:      'مرفوض',
  completed:     'مكتمل',
  cancelled:     'ملغى',
};

const STATUS_COLORS: Record<string, string> = {
  pending:       '#f59e0b',
  in_progress:   '#3b82f6',
  in_review:     '#8b5cf6',
  needs_changes: '#f97316',
  approved:      '#22c55e',
  rejected:      '#ef4444',
  completed:     '#22c55e',
  cancelled:     '#6b7280',
};

const EMPLOYEE_STATUS_OPTIONS = ['in_progress', 'in_review', 'needs_changes', 'approved', 'rejected', 'completed', 'cancelled'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const color = STATUS_COLORS[status] ?? COLORS.muted;
  const label = STATUS_LABELS[status] ?? status;
  return (
    <View style={[pill.wrap, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <View style={[pill.dot, { backgroundColor: color }]} />
      <Text style={[pill.text, { color, fontSize: small ? 9 : 11 }]}>{label}</Text>
    </View>
  );
}
const pill = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontFamily: FONTS.bold },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const { profile, signOut, refreshProfile } = useAuth();

  // Navigation
  const [view, setView] = useState<ScreenView>('list');
  const [queueTab, setQueueTab] = useState<QueueTab>('requests');

  // Queue data
  const [queue, setQueue] = useState<RequestItem[] | null>(null);
  const [quickRequests, setQuickRequests] = useState<QuickRequest[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Chat data
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [customer, setCustomer] = useState<{ id: string; given_name: string | null; avatar_key: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Chat input
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Status update
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [nextStatus, setNextStatus] = useState('in_review');
  const [statusNote, setStatusNote] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Payment
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'zaincash' | 'qi_card'>('zaincash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');

  // Profile settings
  const [specialization, setSpecialization] = useState('');
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // ── Load queue ────────────────────────────────────────────────────────────

  const loadQueue = useCallback(async () => {
    supabase.rpc('expire_stale_claims').then(() => {});
    const { data } = await supabase
      .from('requests')
      .select('id, title, category, status, assigned_employee_id, customer_id, created_at')
      .order('created_at', { ascending: false });
    setQueue((data ?? []) as RequestItem[]);
    setRefreshing(false);
  }, []);

  const loadQuickRequests = useCallback(async () => {
    const { data } = await supabase
      .from('quick_requests')
      .select('id, section_name, content, status, created_at, customer:profiles!customer_id(id, given_name, family_name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setQuickRequests((data ?? []) as unknown as QuickRequest[]);
  }, []);

  // ── Load employee extra fields ────────────────────────────────────────────

  useEffect(() => {
    if (!profile || profileLoaded) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('specialization, active_services')
        .eq('id', profile.id)
        .single();
      if (data) {
        setSpecialization(data.specialization ?? '');
        setActiveServices(data.active_services ?? []);
      }
      setProfileLoaded(true);
    })();
  }, [profile, profileLoaded]);

  // ── Load categories ───────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('categories')
      .select('key, name_ar')
      .order('display_order')
      .then(({ data }) => { if (data) setCategories(data as Category[]); });
  }, []);

  // ── Initial data load + realtime ──────────────────────────────────────────

  useEffect(() => {
    if (!profile) return;
    loadQueue();
    loadQuickRequests();

    const channel = supabase
      .channel('employee-requests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadQueue();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_requests' }, () => {
        loadQuickRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, loadQueue, loadQuickRequests]);

  // ── Chat realtime ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`emp-detail-${selectedId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'request_messages',
        filter: `request_id=eq.${selectedId}`,
      }, () => loadDetail(selectedId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Auto-scroll on new messages ───────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0 && view === 'chat') {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, view]);

  // ── Load chat detail ──────────────────────────────────────────────────────

  async function loadDetail(requestId: string) {
    setLoadingChat(true);
    const [{ data: msgRows }, { data: histRows }, { data: reqRow }] = await Promise.all([
      supabase
        .from('request_messages')
        .select('id, sender_id, body, attachment_url, message_type, created_at, read_at')
        .eq('request_id', requestId)
        .order('created_at'),
      supabase
        .from('request_status_history')
        .select('old_status, new_status, note, created_at')
        .eq('request_id', requestId)
        .order('created_at'),
      supabase.from('requests').select('customer_id').eq('id', requestId).maybeSingle(),
    ]);
    setMessages((msgRows ?? []) as Message[]);
    setHistory((histRows ?? []) as HistoryEntry[]);
    setLoadingChat(false);

    // Mark messages from customer as read
    const unread = (msgRows ?? []).filter((m: Message) => m.sender_id !== profile?.id && !m.read_at);
    if (unread.length > 0) {
      supabase
        .from('request_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread.map((m: Message) => m.id))
        .then(() => {});
    }

    if (reqRow?.customer_id) {
      const { data: cust } = await supabase
        .from('profiles')
        .select('id, given_name, avatar_key')
        .eq('id', reqRow.customer_id)
        .maybeSingle();
      setCustomer(cust ?? null);
    } else {
      setCustomer(null);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function openChat(req: RequestItem) {
    setSelectedId(req.id);
    setSelectedRequest(req);
    setMessages([]);
    setHistory([]);
    setShowStatusForm(false);
    setShowPaymentForm(false);
    setShowHistory(false);
    setMessageBody('');
    setView('chat');
    loadDetail(req.id);
  }

  async function claimRequest(requestId: string) {
    if (!profile) return;
    await supabase.from('requests').update({ assigned_employee_id: profile.id }).eq('id', requestId);
    await loadQueue();
    const req = queue?.find((r) => r.id === requestId);
    if (req) openChat({ ...req, assigned_employee_id: profile.id });
  }

  async function handleStatusUpdate() {
    if (!selectedId) return;
    setStatusSaving(true);
    await supabase.rpc('set_request_status', {
      p_request_id: selectedId,
      p_new_status: nextStatus,
      p_note: statusNote || null,
    });
    setStatusNote('');
    setShowStatusForm(false);
    setStatusSaving(false);
    loadQueue();
    loadDetail(selectedId);
  }

  async function handleSend() {
    const text = messageBody.trim();
    if (!text || !profile || !selectedId) return;
    setSending(true);
    setMessageBody('');
    await supabase.from('request_messages').insert({
      request_id: selectedId,
      sender_id: profile.id,
      body: text,
      message_type: 'text',
    });
    setSending(false);
  }

  async function handleLogPayment() {
    if (!paymentAmount || !selectedId || !profile || !selectedRequest) return;
    setPaymentSaving(true);
    const amount = parseFloat(paymentAmount);
    const payloadBody = JSON.stringify({ method: paymentMethod, amount, notes: paymentNotes });

    await Promise.all([
      supabase.from('request_payments').insert({
        request_id: selectedId,
        employee_id: profile.id,
        customer_id: selectedRequest.customer_id,
        method: paymentMethod,
        amount,
        notes: paymentNotes || null,
        logged_by: profile.id,
      }),
      supabase.from('request_messages').insert({
        request_id: selectedId,
        sender_id: profile.id,
        body: payloadBody,
        message_type: 'payment_proposal',
      }),
    ]);

    setPaymentAmount('');
    setPaymentNotes('');
    setShowPaymentForm(false);
    setPaymentSuccess('تم تسجيل الدفعة بنجاح ✓');
    setTimeout(() => setPaymentSuccess(''), 3000);
    setPaymentSaving(false);
    loadDetail(selectedId);
  }

  async function handleAcceptQuick(requestId: string) {
    const { data, error } = await supabase.rpc('accept_quick_request', { p_request_id: requestId });
    if (!error && data) {
      Alert.alert('قبلت الطلب', 'تم فتح محادثة خاصة مع الزبون.');
      loadQuickRequests();
    }
  }

  async function handleRejectQuick(requestId: string) {
    await supabase.rpc('reject_quick_request', { p_request_id: requestId });
    loadQuickRequests();
  }

  async function toggleService(key: string) {
    if (!profile) return;
    const next = activeServices.includes(key)
      ? activeServices.filter((k) => k !== key)
      : [...activeServices, key];
    setActiveServices(next);
    await supabase.from('profiles').update({ active_services: next }).eq('id', profile.id);
    loadQueue();
  }

  async function saveProfile() {
    if (!profile) return;
    setProfileSaving(true);
    await supabase.from('profiles').update({ specialization }).eq('id', profile.id);
    setProfileSaving(false);
    refreshProfile();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE VIEW
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'profile') {
    return (
      <ScreenBg>
        <View style={styles.navBar}>
          <Pressable onPress={() => setView('list')} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.navTitle}>إعدادات الملف الوظيفي</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.profileScroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 التخصص</Text>
            <TextInput
              value={specialization}
              onChangeText={setSpecialization}
              placeholder="مثال: معاملات عسكرية، دراسية..."
              placeholderTextColor={COLORS.white40}
              style={styles.input}
              textAlign="right"
            />
            <Pressable
              onPress={saveProfile}
              disabled={profileSaving}
              style={({ pressed }) => [styles.goldBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.goldBtnText}>{profileSaving ? '...' : 'حفظ التخصص'}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 الخدمات النشطة</Text>
            <Text style={styles.cardSub}>اختر الفئات التي تعمل عليها — ستظهر لك طلباتها فقط</Text>
            {categories.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => toggleService(cat.key)}
                style={styles.serviceRow}
              >
                <View style={[styles.serviceCheckbox, activeServices.includes(cat.key) && styles.serviceCheckboxActive]}>
                  {activeServices.includes(cat.key) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.serviceLabel}>{cat.name_ar}</Text>
              </Pressable>
            ))}
          </View>
          {/* HQ tools */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🛠️ أدوات الموظف</Text>
            {[
              { label: '🔗 روابط الأخبار', route: '/(hq)/news-links' },
              { label: '🚨 أخبار عاجلة', route: '/(hq)/urgent-news' },
              { label: '📰 المنشورات', route: '/(hq)/social-posts' },
            ].map((item) => (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as never)}
                style={({ pressed }) => [styles.hqLink, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.hqLinkText}>{item.label}</Text>
                <Text style={styles.hqArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ScreenBg>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT VIEW
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'chat' && selectedRequest) {
    const isClosed = ['completed', 'cancelled'].includes(selectedRequest.status);
    const custName = customer?.given_name ?? 'الزبون';

    return (
      <ScreenBg>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Nav header */}
          <View style={styles.chatNavBar}>
            <Pressable onPress={() => setView('list')} style={styles.backBtn} hitSlop={12}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Avatar
              avatarKey={customer?.avatar_key}
              name={custName}
              seed={customer?.id}
              size={34}
            />
            <View style={styles.chatNavCenter}>
              <Text style={styles.chatNavTitle} numberOfLines={1}>{selectedRequest.title}</Text>
              <StatusPill status={selectedRequest.status} small />
            </View>
            <Pressable
              onPress={() => { setShowStatusForm((v) => !v); setShowHistory(false); }}
              style={styles.settingsBtn}
              hitSlop={8}
            >
              <Text style={[styles.settingsIcon, showStatusForm && { color: COLORS.gold }]}>⚙️</Text>
            </Pressable>
          </View>

          {/* Status update panel */}
          {showStatusForm && (
            <View style={styles.statusPanel}>
              <Text style={styles.statusPanelTitle}>تحديث حالة الطلب</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                {EMPLOYEE_STATUS_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setNextStatus(s)}
                    style={[styles.statusOption, nextStatus === s && styles.statusOptionActive]}
                  >
                    <Text style={[styles.statusOptionText, nextStatus === s && { color: COLORS.gold }]}>
                      {STATUS_LABELS[s] ?? s}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                value={statusNote}
                onChangeText={setStatusNote}
                placeholder="ملاحظة (اختياري)..."
                placeholderTextColor={COLORS.white40}
                style={styles.statusNoteInput}
                textAlign="right"
              />
              <Pressable
                onPress={handleStatusUpdate}
                disabled={statusSaving}
                style={({ pressed }) => [styles.goldBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.goldBtnText}>{statusSaving ? '...' : 'حفظ التحديث'}</Text>
              </Pressable>

              {/* History toggle */}
              <Pressable onPress={() => setShowHistory((v) => !v)} style={styles.historyToggle}>
                <Text style={styles.historyToggleText}>
                  {showHistory ? '▲ إخفاء سجل الحالات' : '▼ سجل الحالات'}
                </Text>
              </Pressable>
              {showHistory && (
                <View style={styles.historyList}>
                  {history.length === 0 ? (
                    <Text style={styles.historyEmpty}>لا يوجد تاريخ بعد</Text>
                  ) : (
                    history.map((entry, i) => (
                      <View key={i} style={styles.historyItem}>
                        <Text style={styles.historyStatus}>{STATUS_LABELS[entry.new_status] ?? entry.new_status}</Text>
                        <Text style={styles.historyTime}>
                          {new Date(entry.created_at).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })}
                        </Text>
                        {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* Messages */}
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
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatEmoji}>💬</Text>
                  <Text style={styles.emptyChatText}>لا توجد رسائل بعد — ابدأ المحادثة</Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const isMine = item.sender_id === profile?.id;
                const prev = messages[index - 1];
                const bundled = !!(prev && prev.sender_id === item.sender_id &&
                  new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() < 120_000);
                return (
                  <MessageBubble
                    body={item.body ?? ''}
                    isMine={isMine}
                    timestamp={item.created_at}
                    messageType={item.message_type ?? undefined}
                    bundled={bundled}
                  />
                );
              }}
            />
          )}

          {/* Payment success toast */}
          {paymentSuccess ? (
            <View style={styles.paymentSuccessToast}>
              <Text style={styles.paymentSuccessText}>{paymentSuccess}</Text>
            </View>
          ) : null}

          {/* Payment form */}
          {showPaymentForm && (
            <View style={styles.paymentForm}>
              <View style={styles.paymentFormHeader}>
                <Text style={styles.paymentFormTitle}>💰 تسجيل اتفاقية دفع</Text>
                <Pressable onPress={() => setShowPaymentForm(false)} hitSlop={8}>
                  <Text style={styles.paymentFormClose}>✕</Text>
                </Pressable>
              </View>
              <View style={styles.methodRow}>
                {(['zaincash', 'qi_card'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setPaymentMethod(m)}
                    style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                  >
                    <Text style={[styles.methodBtnText, paymentMethod === m && { color: '#000' }]}>
                      {m === 'zaincash' ? 'ZainCash' : 'Qi Card'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="المبلغ بالدينار العراقي"
                placeholderTextColor={COLORS.white40}
                style={styles.input}
                keyboardType="numeric"
                textAlign="right"
              />
              <TextInput
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="ملاحظات (اختياري)"
                placeholderTextColor={COLORS.white40}
                style={styles.input}
                textAlign="right"
              />
              <Pressable
                onPress={handleLogPayment}
                disabled={paymentSaving || !paymentAmount}
                style={({ pressed }) => [styles.goldBtn, (!paymentAmount || paymentSaving) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.goldBtnText}>{paymentSaving ? '...' : 'تسجيل الدفعة'}</Text>
              </Pressable>
            </View>
          )}

          {/* Input bar */}
          {!isClosed ? (
            <View style={styles.inputBar}>
              <Pressable
                onPress={() => setShowPaymentForm((v) => !v)}
                style={[styles.toolBtn, showPaymentForm && styles.toolBtnActive]}
                hitSlop={6}
              >
                <Text style={styles.toolBtnIcon}>💰</Text>
              </Pressable>
              <TextInput
                value={messageBody}
                onChangeText={setMessageBody}
                placeholder="اكتب رسالة..."
                placeholderTextColor={COLORS.white40}
                style={styles.textInput}
                multiline
                textAlign="right"
                maxLength={2000}
              />
              <Pressable
                onPress={handleSend}
                disabled={sending || !messageBody.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!messageBody.trim() || sending) && styles.sendBtnDisabled,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.sendIcon}>↑</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.closedBar}>
              <Text style={styles.closedText}>
                {selectedRequest.status === 'completed' ? '✅ تم إنجاز الطلب' : '❌ تم إلغاء الطلب'}
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </ScreenBg>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const fullName = [profile?.given_name, profile?.family_name].filter(Boolean).join(' ') || 'الموظف';
  const myRequests = queue?.filter((r) => r.assigned_employee_id === profile?.id) ?? [];
  const unclaimedRequests = queue?.filter((r) => !r.assigned_employee_id) ?? [];
  const allVisible = [...unclaimedRequests, ...myRequests.filter((r) => !unclaimedRequests.find((u) => u.id === r.id))];
  const pending = myRequests.filter((r) => r.status === 'pending').length;
  const inProgress = myRequests.filter((r) => r.status === 'in_progress').length;
  const completed = myRequests.filter((r) => r.status === 'completed').length;
  const quickBadge = quickRequests?.length ?? 0;

  if (queue === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <ScreenBg>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadQueue(); loadQuickRequests(); }}
            tintColor={COLORS.gold}
          />
        }
      >
        {/* Header */}
        <View style={styles.listHeader}>
          <Pressable onPress={() => { Alert.alert('تسجيل الخروج', 'هل تريد الخروج؟', [{ text: 'إلغاء', style: 'cancel' }, { text: 'خروج', style: 'destructive', onPress: signOut }]); }} hitSlop={8}>
            <Text style={styles.headerIcon}>🚪</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerBadgeRow}>
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
          </View>
          <Pressable onPress={() => setView('profile')} hitSlop={8}>
            <Text style={styles.headerIcon}>⚙️</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { value: pending, label: 'انتظار', color: '#f59e0b', emoji: '⏳' },
            { value: inProgress, label: 'معالجة', color: '#3b82f6', emoji: '⚡' },
            { value: completed, label: 'مكتملة', color: '#22c55e', emoji: '✅' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { borderColor: s.color + '30' }]}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Queue tabs */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setQueueTab('requests')}
            style={[styles.tab, queueTab === 'requests' && styles.tabActive]}
          >
            <Text style={[styles.tabText, queueTab === 'requests' && styles.tabTextActive]}>📋 الطلبات</Text>
          </Pressable>
          <Pressable
            onPress={() => setQueueTab('quick')}
            style={[styles.tab, queueTab === 'quick' && styles.tabActive, queueTab === 'quick' && styles.tabActiveQuick]}
          >
            <Text style={[styles.tabText, queueTab === 'quick' && styles.tabTextQuick]}>
              ⚡ سريع{quickBadge > 0 ? ` (${quickBadge})` : ''}
            </Text>
          </Pressable>
        </View>

        {/* Requests list */}
        {queueTab === 'requests' ? (
          allVisible.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>لا توجد طلبات</Text>
              <Text style={styles.emptySub}>ستظهر هنا الطلبات المتاحة</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {allVisible.map((req) => {
                const isMine = req.assigned_employee_id === profile?.id;
                const isUnclaimed = !req.assigned_employee_id;
                const statusColor = STATUS_COLORS[req.status] ?? COLORS.muted;
                return (
                  <Pressable
                    key={req.id}
                    onPress={() => isMine ? openChat(req) : null}
                    style={({ pressed }) => [
                      styles.reqCard,
                      isUnclaimed && styles.reqCardUnclaimed,
                      pressed && isMine && { opacity: 0.75 },
                    ]}
                  >
                    <View style={[styles.accentBar, { backgroundColor: statusColor }]} />
                    <View style={styles.reqCardInner}>
                      <View style={styles.reqCardTop}>
                        <StatusPill status={req.status} small />
                        <Text style={styles.reqTitle} numberOfLines={2}>{req.title}</Text>
                      </View>
                      <View style={styles.reqCardBottom}>
                        {isUnclaimed ? (
                          <Pressable
                            onPress={() => claimRequest(req.id)}
                            style={styles.claimBtn}
                          >
                            <Text style={styles.claimBtnText}>+ استلم الطلب</Text>
                          </Pressable>
                        ) : (
                          <View style={styles.myBadge}>
                            <Text style={styles.myBadgeText}>طلبي</Text>
                          </View>
                        )}
                        <Text style={styles.reqCategory}>{req.category}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )
        ) : (
          /* Quick requests */
          quickRequests === null ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.gold} />
            </View>
          ) : quickRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⚡</Text>
              <Text style={styles.emptyTitle}>لا توجد طلبات سريعة</Text>
              <Text style={styles.emptySub}>ستظهر هنا طلبات الزبائن السريعة</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {quickRequests.map((req) => {
                const name = [req.customer?.given_name, req.customer?.family_name].filter(Boolean).join(' ') || '—';
                return (
                  <View key={req.id} style={styles.quickCard}>
                    <Text style={styles.quickSection}>{req.section_name}</Text>
                    <Text style={styles.quickCustomer}>👤 {name}</Text>
                    <Text style={styles.quickContent} numberOfLines={4}>{req.content}</Text>
                    <View style={styles.quickActions}>
                      <Pressable
                        onPress={() => handleAcceptQuick(req.id)}
                        style={({ pressed }) => [styles.quickAccept, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.quickAcceptText}>✓ قبول</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRejectQuick(req.id)}
                        style={({ pressed }) => [styles.quickReject, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.quickRejectText}>✕ رفض</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </ScreenBg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14 },

  // Header
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4 },
  headerIcon: { fontSize: 22, padding: 6 },
  headerCenter: { alignItems: 'center', gap: 6 },
  headerBadgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  roleBadge: { backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: 'rgba(230,171,44,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  roleBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  verifiedBadge: { backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 11, color: '#3b82f6' },
  empName: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#161b22', borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { fontFamily: FONTS.bold, fontSize: 22 },
  statLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.muted },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(230,171,44,0.15)' },
  tabActiveQuick: { backgroundColor: 'rgba(245,158,11,0.15)' },
  tabText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white40 },
  tabTextActive: { color: COLORS.gold },
  tabTextQuick: { color: '#f59e0b' },

  // Request cards
  list: { gap: 10 },
  reqCard: { backgroundColor: '#161b22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.md, flexDirection: 'row', overflow: 'hidden' },
  reqCardUnclaimed: { borderColor: 'rgba(230,171,44,0.25)', backgroundColor: 'rgba(230,171,44,0.04)' },
  accentBar: { width: 4 },
  reqCardInner: { flex: 1, padding: 12, gap: 8 },
  reqCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' },
  reqTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, flex: 1, textAlign: 'right' },
  reqCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqCategory: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white40 },
  claimBtn: { backgroundColor: 'rgba(230,171,44,0.15)', borderWidth: 1, borderColor: 'rgba(230,171,44,0.4)', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  claimBtnText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  myBadge: { backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  myBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#60a5fa' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10, backgroundColor: '#161b22', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 24 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  emptySub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  // Quick cards
  quickCard: { backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: RADIUS.md, padding: 14, gap: 8 },
  quickSection: { fontFamily: FONTS.bold, fontSize: 11, color: '#f59e0b' },
  quickCustomer: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },
  quickContent: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, lineHeight: 20, textAlign: 'right' },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickAccept: { flex: 1, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  quickAcceptText: { fontFamily: FONTS.bold, fontSize: 12, color: '#22c55e' },
  quickReject: { flex: 1, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  quickRejectText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444' },

  // ── Chat view ──────────────────────────────────────────────────────────────
  chatNavBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 8 : 12, paddingBottom: 10, backgroundColor: '#161b22', borderBottomWidth: 1, borderBottomColor: 'rgba(230,171,44,0.15)', gap: 8 },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 8 : 12, paddingBottom: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.white10 },
  navTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, flex: 1, textAlign: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(230,171,44,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: COLORS.gold, lineHeight: 28 },
  chatNavCenter: { flex: 1, gap: 4 },
  chatNavTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, textAlign: 'right' },
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 20, color: COLORS.muted },

  // Status panel
  statusPanel: { backgroundColor: '#161b22', borderBottomWidth: 1, borderBottomColor: 'rgba(230,171,44,0.15)', padding: 12, gap: 10 },
  statusPanelTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, textAlign: 'right' },
  statusScroll: { flexGrow: 0 },
  statusOption: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 6 },
  statusOptionActive: { backgroundColor: 'rgba(230,171,44,0.15)', borderColor: 'rgba(230,171,44,0.5)' },
  statusOptionText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white70 },
  statusNoteInput: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: 'rgba(230,171,44,0.25)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 13 },

  // History
  historyToggle: { paddingVertical: 4 },
  historyToggleText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, textAlign: 'right' },
  historyList: { gap: 8, paddingTop: 4 },
  historyEmpty: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  historyItem: { borderRightWidth: 2, borderRightColor: 'rgba(230,171,44,0.3)', paddingRight: 10, gap: 2 },
  historyStatus: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  historyTime: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.muted },
  historyNote: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white50 },

  // Messages
  msgList: { padding: 12, paddingBottom: 8 },
  emptyChat: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyChatEmoji: { fontSize: 40 },
  emptyChatText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  // Payment
  paymentSuccessToast: { backgroundColor: 'rgba(34,197,94,0.15)', borderTopWidth: 1, borderTopColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 16, paddingVertical: 8 },
  paymentSuccessText: { fontFamily: FONTS.bold, fontSize: 13, color: '#22c55e', textAlign: 'center' },
  paymentForm: { backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: 'rgba(230,171,44,0.2)', padding: 14, gap: 10 },
  paymentFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentFormTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  paymentFormClose: { fontSize: 16, color: COLORS.muted, padding: 4 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingVertical: 9, alignItems: 'center' },
  methodBtnActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  methodBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white70 },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 22 : 10, gap: 8, backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: 'rgba(230,171,44,0.15)' },
  toolBtn: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  toolBtnActive: { backgroundColor: 'rgba(230,171,44,0.2)' },
  toolBtnIcon: { fontSize: 18 },
  textInput: { flex: 1, backgroundColor: '#0d1117', borderWidth: 1, borderColor: 'rgba(230,171,44,0.25)', borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14, maxHeight: 100, minHeight: 42 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(230,171,44,0.3)' },
  sendIcon: { fontSize: 20, color: '#000', fontFamily: FONTS.bold },
  closedBar: { paddingVertical: 14, alignItems: 'center', backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: Platform.OS === 'ios' ? 28 : 14 },
  closedText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  // Profile view
  profileScroll: { padding: 16, gap: 16 },
  card: { backgroundColor: '#161b22', borderWidth: 1, borderColor: 'rgba(230,171,44,0.15)', borderRadius: RADIUS.xl, padding: 16, gap: 12 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  cardSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: 'rgba(230,171,44,0.25)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14 },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  serviceCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(230,171,44,0.4)', alignItems: 'center', justifyContent: 'center' },
  serviceCheckboxActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  checkmark: { fontSize: 13, color: '#000', fontFamily: FONTS.bold },
  serviceLabel: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  hqLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.white10 },
  hqLinkText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  hqArrow: { fontSize: 20, color: COLORS.muted },
});
