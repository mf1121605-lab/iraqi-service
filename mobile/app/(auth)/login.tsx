import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
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
import { AboutPrivacyModal } from '@/components/ui/AboutPrivacyModal';
import { ThemedText, ThemedBox } from '@/components/ui/Themed';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]           = useState('');
  const [infoModal, setInfoModal]   = useState<'about' | 'privacy' | null>(null);

  // ── Entrance choreography ──────────────────────────────────────────
  // The login form itself (cardOpacity/cardY, previously gating the
  // entire card behind a ~1.2s sequential fade delayed 680ms) is
  // deliberately no longer part of this animation — confirmed via a
  // real device screenshot that it can render invisible (opacity stuck
  // at 0, still occupying layout space) if that delayed animation
  // stalls or the screen is captured slightly early. The functional
  // login form must never depend on an animation completing to become
  // visible. Logo/title entrance stays purely cosmetic.
  const emblemOpacity = useSharedValue(0);
  const emblemScale   = useSharedValue(0.4);
  const titleOpacity  = useSharedValue(0);
  const titleY        = useSharedValue(14);
  const lineWidth     = useSharedValue(0);

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
    lineWidth.value     = withDelay(580, withTiming(76, { duration: 550, easing: Easing.out(Easing.cubic) }));

    return () => { sound?.unloadAsync(); };
    // Reanimated shared values are stable across renders; this intro
    // sequence is meant to run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emblemStyle = useAnimatedStyle(() => ({
    opacity: emblemOpacity.value,
    transform: [{ scale: emblemScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const lineStyle = useAnimatedStyle(() => ({ width: lineWidth.value }));

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
        <View style={styles.scroll}>

          {/* Logo — full brand mark (eagle + baked-in platform name), materializes with the eagle cry */}
          <View style={styles.header}>
            <Animated.View style={emblemStyle}>
              <CinematicEmblem size={108} />
            </Animated.View>
            <Animated.Text style={[styles.appName, titleStyle]}>خدماتي</Animated.Text>
            <Animated.View style={[styles.subtitleLine, lineStyle]} />
          </View>

          {/* Login Card — spinning gold shimmer border via Skia. Not gated
              behind any entrance animation. Confirmed via two rounds of
              real-device testing that AnimatedGoldBorder's inner wrapper
              defaults to flex:1, which needs the root to have an EXPLICIT
              HEIGHT to size reliably — width alone (cardBorder) was not
              enough, the card still rendered at 0 height. fillHeight=false
              switches the inner wrapper to content-driven sizing instead,
              which is what a card with dynamic height (error text
              appearing/disappearing) actually needs. */}
          <View style={styles.cardWrap}>
            <AnimatedGoldBorder borderRadius={RADIUS.xl} borderWidth={1.5} innerBg="transparent" speed={3200} style={styles.cardBorder} fillHeight={false}>
              <GoldCard style={styles.card}>
                <ThemedText id="login.cardTitle" label="عنوان بطاقة تسجيل الدخول" bold style={styles.cardTitle}>تسجيل الدخول</ThemedText>

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
                  {error ? <ThemedText id="login.errorText" label="نص رسالة الخطأ" style={styles.error}>{error}</ThemedText> : null}
                  <GoldButton label="دخول" onPress={handleLogin} loading={loading} />
                  <Pressable
                    style={styles.forgotBtn}
                    onPress={() => router.push('/(auth)/forgot-password')}
                  >
                    <ThemedText id="login.forgotText" label="نص نسيت كلمة المرور" style={styles.forgotText}>نسيت كلمة المرور؟</ThemedText>
                  </Pressable>
                </View>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <ThemedText id="login.dividerText" label='نص الفاصل "أو"' style={styles.dividerText}>أو</ThemedText>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Sign-In — raised 3D button with the real Google "G" mark */}
                <Pressable
                  style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <ThemedBox id="login.googleBadge" label="خلفية شارة غوغل" style={styles.googleBadge}>
                    <GoogleGLogo size={18} />
                  </ThemedBox>
                  <ThemedText id="login.googleText" label="نص زر الدخول بغوغل" bold style={styles.googleText}>
                    {googleLoading ? 'جاري الاتصال...' : 'الدخول بحساب Google'}
                  </ThemedText>
                </Pressable>
              </GoldCard>
            </AnimatedGoldBorder>
          </View>

          {/* Register link */}
          <View style={styles.linkRow}>
            <ThemedText id="login.registerPrompt" label="نص دعوة إنشاء حساب" style={styles.linkText}>ليس لديك حساب؟ </ThemedText>
            <Link href="/(auth)/register">
              <ThemedText id="login.registerLink" label="رابط إنشاء حساب" bold style={styles.link}>إنشاء حساب</ThemedText>
            </Link>
          </View>

          {/* من نحن / سياسة الخصوصية — glass boxes with a shimmering animated gold border.
              fillHeight={false}: same fix as the login card. The earlier
              hardcoded width/height (infoBtnBorderSmall/Large) got the
              text to render but the fixed width was a guess that didn't
              match the actual rendered text — "سياسة الخصوصية" overflowed
              its box on a real device. Content-driven sizing is correct
              here, not a hardcoded guess. */}
          <View style={styles.infoRow}>
            <Pressable style={({ pressed }) => pressed && { opacity: 0.8 }} onPress={() => setInfoModal('about')}>
              <AnimatedGoldBorder borderRadius={RADIUS.sm} borderWidth={1.25} innerBg="transparent" speed={3200} innerStyle={styles.infoBtn} fillHeight={false}>
                <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
                <ThemedText id="login.aboutBtnText" label="نص زر من نحن" bold style={styles.infoBtnText}>من نحن</ThemedText>
              </AnimatedGoldBorder>
            </Pressable>
            <Pressable style={({ pressed }) => pressed && { opacity: 0.8 }} onPress={() => setInfoModal('privacy')}>
              <AnimatedGoldBorder borderRadius={RADIUS.sm} borderWidth={1.25} innerBg="transparent" speed={3200} innerStyle={styles.infoBtn} fillHeight={false}>
                <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
                <ThemedText id="login.privacyBtnText" label="نص زر سياسة الخصوصية" bold style={styles.infoBtnText}>سياسة الخصوصية</ThemedText>
              </AnimatedGoldBorder>
            </Pressable>
          </View>

        </View>
      </KeyboardAvoidingView>

      <AboutPrivacyModal variant={infoModal} onClose={() => setInfoModal(null)} />
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, padding: 20, paddingVertical: 14, justifyContent: 'center', gap: 14 },

  header: { alignItems: 'center', gap: 6 },
  appName:  { fontFamily: FONTS.bold,    fontSize: 24, color: COLORS.gold,  letterSpacing: 0.5 },
  subtitleLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.gold,
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },

  // AnimatedGoldBorder measures its own size from onLayout and needs an
  // unambiguous width to resolve reliably — every other usage in the app
  // passes explicit width/height; this is the one spot with dynamic
  // content height, so only width is fixed (via %), height stays auto.
  // Confirmed via a real device screen recording that omitting this
  // entirely can leave the whole card invisible (0-size) with no error.
  cardWrap:   { width: '100%' },
  cardBorder: { width: '100%' },
  card:      { gap: 0, borderWidth: 0, padding: 16 },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  fields: { gap: 10 },

  error: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.red, textAlign: 'center' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 10 },
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

  infoRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 2 },
  infoBtn: { paddingHorizontal: 16, paddingVertical: 7, alignItems: 'center', justifyContent: 'center' },
  infoBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ffffff' },
});
