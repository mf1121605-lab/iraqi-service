import { useEffect, useState } from 'react';
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
import { Audio } from 'expo-av';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ScreenBg } from '@/components/ui/ScreenBg';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldInput } from '@/components/ui/GoldInput';
import { GoldCard } from '@/components/ui/GoldCard';
import { CinematicEmblem } from '@/components/ui/CinematicEmblem';
import { AnimatedGoldBorder } from '@/components/ui/AnimatedGoldBorder';
import { AnimatedLoginGlow } from '@/components/ui/AnimatedLoginGlow';
import { GoogleGLogo } from '@/components/ui/GoogleGLogo';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]           = useState('');

  // ── Entrance choreography ──────────────────────────────────────────
  const emblemOpacity = useSharedValue(0);
  const emblemScale   = useSharedValue(0.4);
  const titleOpacity  = useSharedValue(0);
  const titleY        = useSharedValue(14);
  const subOpacity    = useSharedValue(0);
  const cardOpacity   = useSharedValue(0);
  const cardY         = useSharedValue(28);

  useEffect(() => {
    // Eagle-cry entrance sound, synced with the logo materializing.
    let sound: Audio.Sound | undefined;
    (async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          require('@/assets/sounds/eagle-cry.m4a'),
        );
        sound = s;
        await sound.setVolumeAsync(0.7);
        await sound.playAsync();
      } catch {
        // Silent fallback (e.g. device audio session busy) — visuals still play.
      }
    })();

    emblemOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    emblemScale.value   = withSpring(1, { damping: 8, stiffness: 90 });
    titleOpacity.value  = withDelay(320, withTiming(1, { duration: 450 }));
    titleY.value         = withDelay(320, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
    subOpacity.value    = withDelay(520, withTiming(1, { duration: 400 }));
    cardOpacity.value   = withDelay(680, withTiming(1, { duration: 550 }));
    cardY.value          = withDelay(680, withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }));

    return () => { sound?.unloadAsync(); };
  }, []);

  const emblemStyle = useAnimatedStyle(() => ({
    opacity: emblemOpacity.value,
    transform: [{ scale: emblemScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

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
      {/* Slowly drifting gold glow orbs behind everything — GPU Skia */}
      <AnimatedLoginGlow />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo + Title — cinematic emblem, materializes with the eagle cry */}
          <View style={styles.header}>
            <Animated.View style={emblemStyle}>
              <CinematicEmblem />
            </Animated.View>
            <Animated.Text style={[styles.appName, titleStyle]}>خدماتي</Animated.Text>
            <Animated.Text style={[styles.subtitle, subStyle]}>منصة الخدمات العراقية</Animated.Text>
          </View>

          {/* Login Card — spinning gold shimmer border via Skia */}
          <Animated.View style={cardStyle}>
            <AnimatedGoldBorder borderRadius={RADIUS.xl} borderWidth={1.5} innerBg="transparent" speed={3200}>
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

                {/* Google Sign-In — raised 3D button with the real Google "G" mark */}
                <Pressable
                  style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <View style={styles.googleBadge}>
                    <GoogleGLogo size={18} />
                  </View>
                  <Text style={styles.googleText}>
                    {googleLoading ? 'جاري الاتصال...' : 'الدخول بحساب Google'}
                  </Text>
                </Pressable>
              </GoldCard>
            </AnimatedGoldBorder>
          </Animated.View>

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

  card:      { gap: 0, borderWidth: 0 },
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
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(230,171,44,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.45)',
    borderTopColor: 'rgba(255,255,255,0.18)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.30)',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  googleBtnPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  googleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 4,
    elevation: 3,
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
