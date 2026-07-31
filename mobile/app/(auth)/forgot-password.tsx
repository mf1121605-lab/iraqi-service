import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldInput } from '@/components/ui/GoldInput';
import { GoldCard } from '@/components/ui/GoldCard';
import { CinematicEmblem } from '@/components/ui/CinematicEmblem';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const QUESTIONS: Record<number, string> = {
  1: 'من هو صديقك المفضل؟',
  2: 'ما هو رمز الطوارئ أو الاحتياطي؟',
};

type Step = 'phone' | 'answer' | 'success';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const appUrl = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';

  async function handleFetchQuestion() {
    setError('');
    if (!/^07\d{9}$/.test(phone.trim())) {
      setError('رقم الهاتف غير صحيح (مثال: 07XXXXXXXXX)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${appUrl}/api/customer/recovery-question?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.questionId) {
        setError('لم يتم العثور على سؤال الأمان لهذا الرقم');
        setLoading(false);
        return;
      }
      setQuestionId(data.questionId);
      setStep('answer');
    } catch {
      setError('خطأ في الاتصال بالخادم');
    }
    setLoading(false);
  }

  async function handleRecover() {
    setError('');
    if (!answer.trim()) { setError('يرجى كتابة إجابة سؤال الأمان'); return; }
    if (newPassword.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${appUrl}/api/customer/recover-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          questionAnswer: answer.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data.error as string) || 'فشلت عملية استعادة كلمة المرور');
        setLoading(false);
        return;
      }
      setStep('success');
    } catch {
      setError('خطأ في الاتصال بالخادم');
    }
    setLoading(false);
  }

  if (step === 'success') {
    return (
      <ScreenBg>
        <View style={styles.center}>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>تم تغيير كلمة المرور</Text>
            <Text style={styles.successSub}>يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</Text>
            <Pressable
              style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.loginBtnText}>تسجيل الدخول</Text>
            </Pressable>
          </View>
        </View>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Back button */}
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>العودة</Text>
          </Pressable>

          <View style={styles.header}>
            <CinematicEmblem size={84} />
            <Text style={styles.title}>استعادة كلمة المرور</Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'أدخل رقم هاتفك لاسترداد حسابك'
                : 'أجب على سؤال الأمان وأدخل كلمة مرور جديدة'}
            </Text>
          </View>

          <GoldCard style={styles.card}>
            {step === 'phone' ? (
              <View style={styles.fields}>
                <GoldInput
                  label="رقم الهاتف"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="07XXXXXXXXX"
                  keyboardType="phone-pad"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <GoldButton label="متابعة" onPress={handleFetchQuestion} loading={loading} />
              </View>
            ) : (
              <View style={styles.fields}>
                {/* Security question */}
                <View style={styles.questionBox}>
                  <Text style={styles.questionLabel}>سؤال الأمان</Text>
                  <Text style={styles.questionText}>
                    {questionId ? QUESTIONS[questionId] ?? 'سؤال الأمان' : ''}
                  </Text>
                </View>
                <GoldInput
                  label="إجابة السؤال"
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="اكتب إجابتك هنا"
                />
                <GoldInput
                  label="كلمة المرور الجديدة"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="8 أحرف على الأقل"
                  secureToggle
                />
                <GoldInput
                  label="تأكيد كلمة المرور"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="أعد كتابة كلمة المرور"
                  secureToggle
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <GoldButton label="تغيير كلمة المرور" onPress={handleRecover} loading={loading} />
                <Pressable onPress={() => setStep('phone')} style={styles.changePhoneBtn}>
                  <Text style={styles.changePhoneText}>تغيير رقم الهاتف</Text>
                </Pressable>
              </View>
            )}
          </GoldCard>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { flexGrow: 1, padding: 24, gap: 24 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  backIcon: { fontSize: 22, color: COLORS.gold, lineHeight: 26 },
  backText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.gold },

  header: { alignItems: 'center', gap: 8 },
  title: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.white },
  subtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  card: { gap: 0 },
  fields: { gap: 14 },

  questionBox: {
    backgroundColor: 'rgba(230,171,44,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 4,
  },
  questionLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  questionText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },

  error: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.red, textAlign: 'center' },

  changePhoneBtn: { alignSelf: 'center', paddingVertical: 4 },
  changePhoneText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

  successCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 340,
  },
  successEmoji: { fontSize: 56 },
  successTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  successSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  loginBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.4)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  loginBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold },
});
