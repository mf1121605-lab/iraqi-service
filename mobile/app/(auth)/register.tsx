import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldInput } from '@/components/ui/GoldInput';
import { GoldCard } from '@/components/ui/GoldCard';
import { COLORS, FONTS } from '@/constants/theme';

export default function RegisterScreen() {
  const [form, setForm] = useState({ phone: '', fullName: '', surname: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleRegister() {
    setError('');
    if (!form.phone || !form.fullName || !form.surname || !form.password || !form.confirm) {
      setError('يرجى تعبئة جميع الحقول');
      return;
    }
    if (!/^07\d{9}$/.test(form.phone.trim())) {
      setError('رقم الهاتف غير صحيح');
      return;
    }
    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (form.password !== form.confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      // Auto-generate username from phone: "u" + digits (e.g. u07740338378)
      const username = `u${form.phone.trim()}`;
      const appUrl = process.env.EXPO_PUBLIC_APP_URL;
      if (!appUrl) {
        setError('خطأ: EXPO_PUBLIC_APP_URL غير محدد');
        setLoading(false);
        return;
      }
      const res = await fetch(`${appUrl}/api/customer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          surname: form.surname.trim(),
          username,
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        setError(`خطأ ${res.status}: استجابة غير صالحة من الخادم`);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const msg = (data.error as string) || (data.message as string) || `خطأ ${res.status}`;
        setError(msg);
        setLoading(false);
        return;
      }

      // Sign in after successful registration
      const e164 = `+964${form.phone.trim().slice(1)}`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        phone: e164,
        password: form.password,
      });
      setLoading(false);
      if (signInError) {
        setError(`تم التسجيل. خطأ تسجيل الدخول: ${signInError.message}`);
        router.replace('/(auth)/login');
      } else {
        router.replace('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`خطأ في الاتصال: ${msg}`);
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.appName}>خدماتي</Text>
            <Text style={styles.subtitle}>إنشاء حساب جديد</Text>
          </View>

          <GoldCard style={styles.card}>
            <Text style={styles.title}>بياناتك الشخصية</Text>
            <View style={styles.fields}>
              <GoldInput label="رقم الهاتف" value={form.phone} onChangeText={(v) => setField('phone', v)} placeholder="07XXXXXXXXX" keyboardType="phone-pad" />
              <GoldInput label="الاسم الثلاثي" value={form.fullName} onChangeText={(v) => setField('fullName', v)} placeholder="الاسم الكامل" />
              <GoldInput label="اللقب / الكنية" value={form.surname} onChangeText={(v) => setField('surname', v)} placeholder="اللقب العائلي" />
              <GoldInput label="كلمة المرور" value={form.password} onChangeText={(v) => setField('password', v)} placeholder="8 أحرف على الأقل" secureToggle />
              <GoldInput label="تأكيد كلمة المرور" value={form.confirm} onChangeText={(v) => setField('confirm', v)} placeholder="أعد كتابة كلمة المرور" secureToggle />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <GoldButton label="تسجيل" onPress={handleRegister} loading={loading} />
            </View>
          </GoldCard>

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>لديك حساب بالفعل؟ </Text>
            <Link href="/(auth)/login">
              <Text style={styles.link}>تسجيل الدخول</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// Need to import supabase here
import { supabase } from '@/lib/supabase';

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center', gap: 24 },
  header: { alignItems: 'center', gap: 8 },
  appName: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.gold },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  card: { gap: 4 },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white, textAlign: 'center', marginBottom: 8 },
  fields: { gap: 14 },
  error: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.red, textAlign: 'center' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  link: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },
});
