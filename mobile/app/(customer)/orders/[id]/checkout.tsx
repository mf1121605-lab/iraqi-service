import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Order {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_status: string;
  products: { title_ar: string; title_ckb: string | null } | null;
}

export default function Checkout() {
  const { profile, loading } = useAuth();
  const { id: orderId } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || !orderId) return;
    supabase
      .from('orders')
      .select('id, quantity, unit_price, total_price, payment_status, products(title_ar, title_ckb)')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          router.replace('/(customer)/');
        } else {
          setOrder(data as unknown as Order);
        }
      });
  }, [profile?.id, orderId]);

  async function handleZainCash() {
    if (!orderId) return;
    setError('');
    setProcessing(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch('/api/payment/zaincash-init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json().catch(() => ({ error: true }));
      if (result.error || !result.payUrl) {
        setError('تعذر الاتصال بنظام الدفع');
        setProcessing(false);
        return;
      }
      Linking.openURL(result.payUrl);
    } catch {
      setError('تعذر الاتصال بنظام الدفع');
    }
    setProcessing(false);
  }

  if (loading || !profile || !order) {
    return (
      <ScreenBg>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>💳</Text>
          </View>
          <Text style={styles.title}>إتمام الدفع</Text>

          {/* Order summary */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>ملخص الطلب</Text>
            <Text style={styles.productName}>
              {order.products?.title_ar ?? 'منتج'}
            </Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>المبلغ الإجمالي</Text>
              <Text style={styles.totalAmount}>
                {Number(order.total_price).toLocaleString('ar-IQ')} IQD
              </Text>
            </View>
          </View>

          <Text style={styles.methodLabel}>اختر طريقة الدفع</Text>

          <Pressable
            onPress={handleZainCash}
            disabled={processing}
            style={({ pressed }) => [styles.methodBtn, pressed && styles.methodBtnPressed, processing && styles.methodBtnDisabled]}
          >
            <Text style={styles.methodBtnIcon}>📱</Text>
            <Text style={styles.methodBtnText}>ZainCash</Text>
            <Text style={styles.methodBtnArrow}>›</Text>
          </Pressable>

          {processing && (
            <View style={styles.processingRow}>
              <ActivityIndicator color={COLORS.gold} size="small" />
              <Text style={styles.processingText}>جارٍ المعالجة...</Text>
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 20 },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.xl,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(230,171,44,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconEmoji: { fontSize: 30 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    marginBottom: 20,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 20,
    gap: 6,
  },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
  productName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.white10,
    paddingTop: 10,
  },
  totalLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  totalAmount: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gold },
  methodLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  methodBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    marginBottom: 10,
  },
  methodBtnPressed: { opacity: 0.75 },
  methodBtnDisabled: { opacity: 0.45 },
  methodBtnIcon: { fontSize: 20 },
  methodBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, flex: 1 },
  methodBtnArrow: { fontSize: 20, color: COLORS.muted },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  processingText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },
  error: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 12,
  },
});
