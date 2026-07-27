import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';

interface Employee {
  id: string;
  given_name: string | null;
  father_name: string | null;
  grandfather_name: string | null;
  family_name: string | null;
  specialization: string | null;
  account_status: string;
  admin_level: string | null;
  is_verified: boolean | null;
  created_at: string;
}

interface NewEmpForm {
  username: string;
  phone: string;
  email: string;
  password: string;
  givenName: string;
  fatherName: string;
  grandfatherName: string;
  familyName: string;
  specialization: string;
}

interface Credentials {
  username: string;
  password: string;
  loginUrl: string;
}

const emptyForm = (): NewEmpForm => ({
  username: '', phone: '', email: '', password: '',
  givenName: '', fatherName: '', grandfatherName: '', familyName: '', specialization: '',
});

const FORM_FIELDS: { key: keyof NewEmpForm; label: string; ltr?: boolean; secure?: boolean }[] = [
  { key: 'username', label: 'اسم المستخدم', ltr: true },
  { key: 'password', label: 'كلمة المرور', ltr: true, secure: true },
  { key: 'phone', label: 'رقم الهاتف', ltr: true },
  { key: 'email', label: 'البريد الإلكتروني', ltr: true },
  { key: 'givenName', label: 'الاسم الأول' },
  { key: 'fatherName', label: 'اسم الأب' },
  { key: 'grandfatherName', label: 'اسم الجد' },
  { key: 'familyName', label: 'اسم العائلة' },
  { key: 'specialization', label: 'التخصص' },
];

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', suspended: '#ef4444', pending: '#f59e0b',
};

export default function EmployeesScreen() {
  const { profile, loading, session } = useAuth();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewEmpForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function loadEmployees() {
    const { data } = await supabase
      .from('profiles')
      .select('id, given_name, father_name, grandfather_name, family_name, specialization, account_status, admin_level, is_verified, created_at')
      .eq('role', 'employee')
      .order('created_at', { ascending: false });
    setEmployees((data ?? []) as Employee[]);
  }

  useEffect(() => { if (profile) loadEmployees(); }, [profile]);

  async function handleCreate() {
    if (!session) return;
    setFormError('');
    if (!form.phone && !form.email) { setFormError('رقم الهاتف أو البريد الإلكتروني مطلوب'); return; }
    if (!form.password) { setFormError('كلمة المرور مطلوبة'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${APP_URL}/api/founder/create-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...form, username: form.username.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({ error: 'خطأ في الاستجابة' }));
      if (!res.ok) { setFormError(data.error ?? 'فشل في الإنشاء'); }
      else {
        setCredentials({ username: form.username.trim().toLowerCase(), password: form.password, loginUrl: 'https://iraqi-service.vercel.app/login' });
        setForm(emptyForm());
        setShowForm(false);
        await loadEmployees();
      }
    } catch { setFormError('خطأ في الاتصال'); }
    setSaving(false);
  }

  async function callAction(userId: string, action: string) {
    if (!session) return;
    setActionLoading(userId + action);
    try {
      await fetch(`${APP_URL}/api/founder/manage-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ targetUserId: userId, action }),
      });
      await loadEmployees();
    } finally { setActionLoading(null); }
  }

  function copyField(value: string, key: string) {
    Clipboard.setStringAsync(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function copyAll(creds: Credentials) {
    const text = `بيانات الدخول:\nاسم المستخدم: ${creds.username}\nكلمة المرور: ${creds.password}\nرابط تسجيل الدخول: ${creds.loginUrl}`;
    Clipboard.setStringAsync(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  }

  function empName(emp: Employee) {
    return [emp.given_name, emp.father_name, emp.family_name].filter(Boolean).join(' ') || '—';
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} /></View></ScreenBg>;
  if (!profile || profile.role !== 'founder') return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>إدارة الموظفين</Text>
        <Pressable onPress={() => { setShowForm((v) => !v); setFormError(''); }} style={s.addBtn}>
          <Text style={s.addBtnText}>{showForm ? '✕' : '+ إضافة'}</Text>
        </Pressable>
      </View>

      {/* Credentials modal */}
      <Modal visible={!!credentials} animationType="slide" transparent onRequestClose={() => setCredentials(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>بيانات تسجيل الدخول ✓</Text>
              <Pressable onPress={() => setCredentials(null)} hitSlop={8}>
                <Text style={s.closeBtn}>✕</Text>
              </Pressable>
            </View>
            {credentials && (
              <>
                {[
                  { key: 'username', label: 'اسم المستخدم', value: credentials.username },
                  { key: 'password', label: 'كلمة المرور', value: credentials.password },
                  { key: 'url', label: 'رابط تسجيل الدخول', value: credentials.loginUrl },
                ].map(({ key, label, value }) => (
                  <View key={key} style={s.credRow}>
                    <Pressable onPress={() => copyField(value, key)} style={s.copyBtn}>
                      <Text style={s.copyBtnText}>{copiedField === key ? 'تم ✓' : 'نسخ'}</Text>
                    </Pressable>
                    <View style={s.credTextBox}>
                      <Text style={s.credLabel}>{label}</Text>
                      <Text style={s.credValue} selectable>{value}</Text>
                    </View>
                  </View>
                ))}
                <Pressable onPress={() => copyAll(credentials)} style={s.copyAllBtn}>
                  <Text style={s.copyAllText}>{copiedField === 'all' ? 'تم نسخ الكل ✓' : 'نسخ جميع البيانات'}</Text>
                </Pressable>
                <Pressable onPress={() => setCredentials(null)} style={s.doneBtn}>
                  <Text style={s.doneBtnText}>تم</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* New employee form */}
        {showForm && (
          <View style={s.card}>
            <Text style={s.cardTitle}>موظف جديد</Text>
            {FORM_FIELDS.map(({ key, label, ltr, secure }) => (
              <TextInput
                key={key}
                value={form[key]}
                onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                placeholder={label}
                placeholderTextColor={COLORS.white40}
                style={[s.input, ltr && { textAlign: 'left' as any, direction: 'ltr' as any }]}
                textAlign={ltr ? 'left' : 'right'}
                secureTextEntry={secure}
                autoCapitalize="none"
                keyboardType={key === 'phone' ? 'phone-pad' : key === 'email' ? 'email-address' : 'default'}
              />
            ))}
            {formError ? <Text style={s.errorText}>{formError}</Text> : null}
            <Pressable onPress={handleCreate} disabled={saving} style={[s.goldBtn, saving && { opacity: 0.6 }]}>
              <Text style={s.goldBtnText}>{saving ? '...' : 'إنشاء الحساب'}</Text>
            </Pressable>
          </View>
        )}

        {/* Employee list */}
        {employees === null ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : employees.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>لا يوجد موظفون</Text></View>
        ) : employees.map((emp) => {
          const isCoAdmin = emp.admin_level === 'co_admin';
          const busy = (k: string) => actionLoading === emp.id + k;
          return (
            <View key={emp.id} style={s.card}>
              {/* Top row: verified badge + name + status badge */}
              <View style={s.cardTop}>
                <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[emp.account_status] ?? COLORS.muted) + '20' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLORS[emp.account_status] ?? COLORS.muted }]}>{emp.account_status}</Text>
                </View>
                <View style={s.nameRow}>
                  {emp.is_verified && (
                    <View style={s.verifiedDot}>
                      <Text style={s.verifiedLabel}>✓ موثّق</Text>
                    </View>
                  )}
                  <Text style={s.empName}>{empName(emp)}</Text>
                </View>
              </View>

              <Text style={s.empSub}>{emp.specialization ?? 'بدون تخصص'}</Text>
              {isCoAdmin && <Text style={s.coAdminTag}>مشرف مشارك</Text>}

              {/* Action buttons */}
              <View style={s.actions}>
                {/* Verify / Unverify */}
                <Pressable
                  onPress={() => callAction(emp.id, emp.is_verified ? 'unverify' : 'verify')}
                  disabled={!!actionLoading}
                  style={[s.actionBtn, emp.is_verified ? s.actionBtnMuted : s.actionBtnBlue]}
                >
                  <Text style={[s.actionText, { color: emp.is_verified ? COLORS.muted : '#3b82f6' }]}>
                    {busy('verify') || busy('unverify') ? '...' : emp.is_verified ? 'إلغاء التوثيق' : 'توثيق ✓'}
                  </Text>
                </Pressable>

                {/* Suspend / Activate */}
                {emp.account_status === 'active' ? (
                  <Pressable onPress={() => callAction(emp.id, 'suspend')} disabled={!!actionLoading} style={[s.actionBtn, s.actionBtnRed]}>
                    <Text style={[s.actionText, { color: '#ef4444' }]}>{busy('suspend') ? '...' : 'تعليق'}</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => callAction(emp.id, 'activate')} disabled={!!actionLoading} style={[s.actionBtn, s.actionBtnGreen]}>
                    <Text style={[s.actionText, { color: '#22c55e' }]}>{busy('activate') ? '...' : 'تفعيل'}</Text>
                  </Pressable>
                )}

                {/* Demote to customer */}
                {!isCoAdmin && (
                  <Pressable onPress={() => callAction(emp.id, 'demote_customer')} disabled={!!actionLoading} style={[s.actionBtn, s.actionBtnMuted]}>
                    <Text style={[s.actionText, { color: COLORS.muted }]}>{busy('demote_customer') ? '...' : 'خفض'}</Text>
                  </Pressable>
                )}
              </View>

              {/* Co-admin toggle */}
              <Pressable
                onPress={() => callAction(emp.id, isCoAdmin ? 'remove_co_admin' : 'assign_co_admin')}
                disabled={!!actionLoading}
                style={[s.coAdminBtn, isCoAdmin && s.coAdminBtnActive]}
              >
                <Text style={[s.coAdminBtnText, { color: isCoAdmin ? COLORS.gold : COLORS.muted }]}>
                  {busy('assign_co_admin') || busy('remove_co_admin') ? '...' : isCoAdmin ? 'إلغاء الإشراف' : 'تعيين مشرف'}
                </Text>
              </Pressable>
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(230,171,44,0.1)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: COLORS.gold, lineHeight: 28 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
  addBtn: { backgroundColor: COLORS.goldDim, borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },
  scroll: { padding: 16, paddingTop: 0, gap: 10 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 8 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  empName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  empSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },
  verifiedDot: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedLabel: { fontFamily: FONTS.bold, fontSize: 10, color: '#3b82f6' },
  coAdminTag: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: { flex: 1, borderRadius: RADIUS.sm, paddingVertical: 7, alignItems: 'center', borderWidth: 1 },
  actionBtnRed: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  actionBtnGreen: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  actionBtnBlue: { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)' },
  actionBtnMuted: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' },
  actionText: { fontFamily: FONTS.bold, fontSize: 11 },
  coAdminBtn: { borderRadius: RADIUS.sm, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  coAdminBtnActive: { borderColor: COLORS.goldBorder, backgroundColor: COLORS.goldDim },
  coAdminBtnText: { fontFamily: FONTS.bold, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 13 },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  errorText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444', textAlign: 'right' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0d1117', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: COLORS.goldBorder, padding: 20, gap: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#22c55e' },
  closeBtn: { fontSize: 18, color: COLORS.muted },
  credRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  credTextBox: { flex: 1, gap: 2 },
  credLabel: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  credValue: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white, textAlign: 'right' },
  copyBtn: { backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7 },
  copyBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },
  copyAllBtn: { backgroundColor: COLORS.goldDim, borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  copyAllText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  doneBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  doneBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
});
