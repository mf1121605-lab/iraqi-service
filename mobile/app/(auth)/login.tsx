import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScreenBg } from '@/components/ui/ScreenBg';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldInput } from '@/components/ui/GoldInput';
import { GoldCard } from '@/components/ui/GoldCard';
import { CinematicEmblem } from '@/components/ui/CinematicEmblem';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]           = useState('');

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      setError('يرجى تعبئة جميع الحقول');
      return;
    }
    setLoading(true);
    setError('');

    const trimmed = identifier.trim();
    let authResult;

    if (/^[a-z][a-z0-9_]{2,}$/i.test(trimmed) && !/^\d/.test(trimmed)) {
      // Username → email alias (same domain used at registration)
      const email = `${trimmed.toLowerCase()}@iraqi-service.vercel.app`;
      authResult = await supabase.auth.signInWithPassword({ email, password });
    } else if (/^07\d{9}$/.test(trimmed)) {
      // Phone number: customers are registered with email alias u+phone@domain.
      // Try that first; fall back to native phone auth for employees who were
      // created without a username.
      const derivedEmail = `u${trimmed}@iraqi-service.vercel.app`;
      authResult = await supabase.auth.signInWithPassword({ email: derivedEmail, password });
      if (authResult.error) {
        const e164 = `+964${trimmed.slice(1)}`;
        const fallback = await supabase.auth.signInWithPassword({ phone: e164, password });
        if (!fallback.error) authResult = fallback;
      }
    } else {
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

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError('');
    try {
      const redirectUrl = Linking.createURL('/');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });

      if (oauthError || !data.url) {
        setError('فشل تسجيل الدخول بـ Google. تأكد من تفعيل Google في لوحة Supabase.');
        setGoogleLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        const fragment = result.url.split('#')[1] ?? result.url.split('?')[1] ?? '';
        const params   = new URLSearchParams(fragment);
        const at       = params.get('access_token');
        const rt       = params.get('refresh_token');

        if (at && rt) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: at,
            refresh_token: rt,
          });
          if (sessionError) {
            setError(sessionError.message);
          } else {
            router.replace('/');
          }
        } else {
          setError('لم يتم استلام رمز الدخول. حاول مرة أخرى.');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`خطأ: ${msg}`);
    }
    setGoogleLoading(false);
  }

  return (
    <ScreenBg>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo + Title — cinematic emblem matching web's .cinematic-emblem */}
          <View style={styles.header}>
            <CinematicEmblem />
            <Text style={styles.appName}>خدماتي</Text>
            <Text style={styles.subtitle}>منصة الخدمات العراقية</Text>
          </View>

          {/* Login Card */}
          <GoldCard style={styles.card}>
            <Text style={styles.cardTitle}>تسجيل الدخول</Text>

            <View style={styles.fields}>
              <GoldInput
                label="اسم المستخدم أو البريد الإلكتروني"
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="username أو email@example.com"
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
              <Pressable
                style={styles.forgotBtn}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In — cinematic gold style */}
            <Pressable
              style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>
                {googleLoading ? 'جاري الاتصال...' : 'الدخول بحساب Google'}
              </Text>
            </Pressable>
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
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 28 },

  header: { alignItems: 'center', gap: 12 },
  appName:  { fontFamily: FONTS.bold,    fontSize: 30, color: COLORS.gold,  letterSpacing: 0.5 },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  card:      { gap: 0 },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  fields: { gap: 14 },

  error: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.red, textAlign: 'center' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(230,171,44,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.45)',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  googleBtnPressed: { opacity: 0.75 },
  googleIcon: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.gold,
    fontFamily: 'System',
  },
  googleText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.gold,
  },

  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  link:     { fontFamily: FONTS.bold,    fontSize: 14, color: COLORS.gold },

  forgotBtn: { alignSelf: 'center', paddingVertical: 4 },
  forgotText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },
});
