import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Employee {
  id: string;
  given_name: string | null;
  family_name: string | null;
  phone: string | null;
  specialization: string | null;
  account_status: string;
  is_verified: boolean | null;
  created_at: string;
}

interface NewEmpForm {
  given_name: string; family_name: string; phone: string;
  password: string; specialization: string;
}

export default function EmployeesScreen() {
  const { profile, loading, session } = useAuth();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewEmpForm>({ given_name: '', family_name: '', phone: '', password: '', specialization: '' });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadEmployees() {
    const { data } = await supabase
      .from('profiles')
      .select('id, given_name, family_name, phone, specialization, account_status, is_verified, created_at')
      .eq('role', 'employee')
      .order('created_at', { ascending: false });
    setEmployees((data ?? []) as Employee[]);
  }

  useEffect(() => { if (profile) loadEmployees(); }, [profile]);

  async function handleVerify(id: string, current: boolean | null) {
    setActionLoading(id);
    await supabase.from('profiles').update({ is_verified: !current }).eq('id', id);
    await loadEmployees();
    setActionLoading(null);
  }

  async function handleCreate() {
    if (!session || !form.phone || !form.password) return;
    setSaving(true);
    try {
      const res = await fetch('/api/founder/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccessMsg(`تم إنشاء الحساب\nالهاتف: ${form.phone}\nكلمة السر: ${form.password}`);
        setForm({ given_name: '', family_name: '', phone: '', password: '', specialization: '' });
        setShowForm(false);
        await loadEmployees();
      } else {
        const err = await res.json().catch(() => ({}));
        setSuccessMsg(`خطأ: ${err.error ?? 'فشل في الإنشاء'}`);
      }
    } finally {
      setSaving(false);
    }
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
        <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
          <Text style={s.addBtnText}>{showForm ? '✕' : '+ إضافة'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {successMsg ? (
          <View style={[s.card, { borderColor: successMsg.startsWith('خطأ') ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)' }]}>
            <Text style={[s.successText, { color: successMsg.startsWith('خطأ') ? '#ef4444' : '#22c55e' }]}>{successMsg}</Text>
            <Pressable onPress={() => setSuccessMsg('')}><Text style={s.dismiss}>إغلاق</Text></Pressable>
          </View>
        ) : null}

        {showForm && (
          <View style={s.card}>
            <Text style={s.cardTitle}>موظف جديد</Text>
            {(['given_name', 'family_name', 'phone', 'password', 'specialization'] as const).map((field) => (
              <TextInput
                key={field}
                value={form[field]}
                onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                placeholder={{ given_name: 'الاسم الأول', family_name: 'الاسم الأخير', phone: 'رقم الهاتف', password: 'كلمة المرور', specialization: 'التخصص' }[field]}
                placeholderTextColor={COLORS.white40}
                style={s.input}
                textAlign="right"
                secureTextEntry={field === 'password'}
              />
            ))}
            <Pressable onPress={handleCreate} disabled={saving || !form.phone || !form.password} style={[s.goldBtn, (saving || !form.phone || !form.password) && { opacity: 0.5 }]}>
              <Text style={s.goldBtnText}>{saving ? '...' : 'إنشاء الحساب'}</Text>
            </Pressable>
          </View>
        )}

        {employees === null ? (
          <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
        ) : employees.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>لا يوجد موظفون</Text></View>
        ) : employees.map((emp) => {
          const name = [emp.given_name, emp.family_name].filter(Boolean).join(' ') || '—';
          return (
            <View key={emp.id} style={s.card}>
              <View style={s.row}>
                <View style={[s.verifiedBadge, { backgroundColor: emp.is_verified ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }]}>
                  <Text style={[s.verifiedText, { color: emp.is_verified ? '#22c55e' : COLORS.muted }]}>{emp.is_verified ? 'موثّق' : 'غير موثق'}</Text>
                </View>
                <Text style={s.empName}>{name}</Text>
              </View>
              <Text style={s.empSub}>{emp.specialization ?? 'بدون تخصص'} · {emp.phone ?? '—'}</Text>
              <Pressable
                onPress={() => handleVerify(emp.id, emp.is_verified)}
                disabled={actionLoading === emp.id}
                style={[s.actionBtn, emp.is_verified ? s.actionBtnRed : s.actionBtnGreen]}
              >
                <Text style={[s.actionText, { color: emp.is_verified ? '#ef4444' : '#22c55e' }]}>
                  {actionLoading === emp.id ? '...' : emp.is_verified ? 'إلغاء التوثيق' : 'توثيق'}
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
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 10 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  empSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  verifiedBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 11 },
  actionBtn: { borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  actionBtnRed: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  actionBtnGreen: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  actionText: { fontFamily: FONTS.bold, fontSize: 12 },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14 },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  successText: { fontFamily: FONTS.bold, fontSize: 13, textAlign: 'right', lineHeight: 22 },
  dismiss: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
});
