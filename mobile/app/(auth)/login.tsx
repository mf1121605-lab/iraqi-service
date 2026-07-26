import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldInput } from '@/components/ui/GoldInput';
import { GoldCard } from '@/components/ui/GoldCard';
import { COLORS, FONTS } from '@/constants/theme';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      setError('يرجى تعبئة جميع الحقول');
      return;
    }
    setLoading(true);
    setError('');

    let authResult;
    const trimmed = identifier.trim();

    // Username login: lowercase letters/digits/underscores
    if (/^[a-z][a-z0-9_]{2,}$/i.test(trimmed) && !/^\d/.test(trimmed)) {
      const email = `${trimmed.toLowerCase()}@iraqi-service.vercel.app`;
      authResult = await supabase.auth.signInWithPassword({ email, password });
    }
    // Phone login
    else if (/^07\d{9}$/.test(trimmed)) {
      const e164 = `+964${trimmed.slice(1)}`;
      authResult = await supabase.auth.signInWithPassword({ phone: e164, password });
    }
    // Email login (founder/employee)
    else {
      authResult = await supabase.auth.signInWithPassword({ email: trimmed, password });
    }

    const { error: authError } = authResult;
    setLoading(false);
    if (authError) {
      const msg = authError.message?.trim();
      setError(msg && !msg.startsWith('{') ? msg : 'بيانات الدخول غير صحيحة');
    } else {
      router.replace('/');
    }
  }

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🏛️</Text>
            </View>
            <Text style={styles.appName}>خدماتي</Text>
            <Text style={styles.subtitle}>منصة الخدمات العراقية</Text>
          </View>

          {/* Card */}
          <GoldCard style={styles.card}>
            <Text style={styles.title}>تسجيل الدخول</Text>
            <View style={styles.fields}>
              <GoldInput
                label="رقم الهاتف أو اسم المستخدم"
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="07XXXXXXXXX"
                keyboardType="default"
                autoCapitalize="none"
              />
              <GoldInput
                label="كلمة المرور"
                value={password}
                onChangeText={setPassword}
                placeholder="كلمة المرور"
                secureToggle
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <GoldButton label="دخول" onPress={handleLogin} loading={loading} />
            </View>
          </GoldCard>

          {/* Register link */}
          <View style={styles.linkRow}>
            <Text style={styles.linkText}>ليس لديك حساب؟ </Text>
            <Link href="/(auth)/register">
              <Text style={styles.link}>إنشاء حساب</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center', gap: 24 },
  header: { alignItems: 'center', gap: 8 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(230,171,44,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(230,171,44,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.gold },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  card: { gap: 4 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  fields: { gap: 14 },
  error: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.red,
    textAlign: 'center',
  },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  link: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },
});
