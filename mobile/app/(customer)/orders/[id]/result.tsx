import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

export default function PaymentResult() {
  const { status } = useLocalSearchParams<{ status: string }>();
  const success = status === 'success';

  return (
    <ScreenBg>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, success ? styles.iconSuccess : styles.iconFail]}>
            <Text style={styles.iconEmoji}>{success ? '✓' : '✕'}</Text>
          </View>

          <Text style={styles.title}>
            {success ? 'تمت عملية الدفع بنجاح' : 'فشلت عملية الدفع'}
          </Text>
          <Text style={styles.body}>
            {success
              ? 'تم تأكيد طلبك بنجاح. سيتواصل معك الموظف قريباً.'
              : 'تعذر إتمام الدفع. يرجى المحاولة مرة أخرى.'}
          </Text>

          {!success && (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>↩ حاول مرة أخرى</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => router.replace('/(customer)/')}
            style={({ pressed }) => [styles.dashBtn, pressed && styles.pressed]}
          >
            <Text style={styles.dashText}>🏠 العودة للرئيسية</Text>
          </Pressable>
        </View>
      </View>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconSuccess: { backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 2, borderColor: 'rgba(52,211,153,0.4)' },
  iconFail: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 2, borderColor: 'rgba(239,68,68,0.4)' },
  iconEmoji: { fontSize: 32, color: COLORS.white },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  retryBtn: {
    width: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryText: { fontFamily: FONTS.bold, fontSize: 15, color: '#000' },
  dashBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dashText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  pressed: { opacity: 0.75 },
});
