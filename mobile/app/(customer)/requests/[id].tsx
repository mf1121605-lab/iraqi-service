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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
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

const CAT_EMOJI: Record<string, string> = {
  military: '🪖', education: '🎓', welfare: '❤️', general: '⭐',
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
  const inputRef = useRef<TextInput>(null);

  const [req, setReq] = useState<RequestDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDesc, setShowDesc] = useState(false);

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
    if (rRes.data) setReq(rRes.data as unknown as RequestDetail);
    if (mRes.data) setMessages(mRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel(`request-detail-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'request_messages',
        filter: `request_id=eq.${id}`,
      }, () => loadData())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'requests',
        filter: `id=eq.${id}`,
      }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, loadData]);

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

  const st = STATUS_META[req.status] ?? { label: req.status, color: COLORS.muted };
  const employeeName = req.employee
    ? `${req.employee.given_name} ${req.employee.family_name}`
    : null;
  const catEmoji = CAT_EMOJI[req.category] ?? '📁';
  const isClosed = req.status === 'completed' || req.status === 'cancelled';

  return (
    <LinearGradient colors={['#080c12', '#0d1117', '#080c12']} style={styles.bg}>
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
            <View style={[styles.statusPill, { backgroundColor: st.color + '20', borderColor: st.color + '50' }]}>
              <View style={[styles.statusDot, { backgroundColor: st.color }]} />
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
          {/* Description toggle */}
          <Pressable onPress={() => setShowDesc((v) => !v)} style={styles.infoBtn} hitSlop={12}>
            <Text style={styles.infoBtnText}>ℹ</Text>
          </Pressable>
        </View>

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
                </View>
              ) : req.status === 'pending' ? (
                <Pressable
                  style={({ pressed }) => [styles.findEmployeeBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push({
                    pathname: '/(customer)/requests/matching',
                    params: { requestId: req.id, category: req.category },
                  })}
                >
                  <Text style={styles.findEmployeeBtnText}>🔍 البحث عن موظف</Text>
                </Pressable>
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
              <Text style={styles.emptyChatSub}>ابدأ المحادثة مع الموظف</Text>
            </View>
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Input bar */}
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
              ref={inputRef}
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
        ) : (
          <View style={styles.closedBar}>
            <Text style={styles.closedBarText}>
              {req.status === 'completed' ? '✅ تم إنجاز الطلب' : '❌ تم إلغاء الطلب'}
            </Text>
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
  noEmployee: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  findEmployeeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230,171,44,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.4)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  findEmployeeBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },

  msgList: { padding: 12, paddingBottom: 8 },
  emptyChat: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyChatEmoji: { fontSize: 40 },
  emptyChatText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  emptyChatSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

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
