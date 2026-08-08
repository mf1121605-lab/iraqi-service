export type PaymentMethod = 'zaincash' | 'qi_card' | 'mastercard' | 'credit';

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  zaincash: 'زين كاش',
  qi_card: 'Qi Card',
  mastercard: 'ماستر كارد',
  credit: 'رصيد',
};

export const PAYMENT_METHOD_COLORS: Record<string, string> = {
  zaincash: '#f59e0b',
  qi_card: '#3b82f6',
  mastercard: '#a78bfa',
  credit: '#22c55e',
};

// A credit/top-up card sale carries a 40% resale commission, since the
// employee has to cash it out separately — the customer effectively pays
// the service price plus a markup, not a 1:1 amount.
export const CREDIT_COMMISSION_RATE = 0.4;

export function creditFinalAmount(baseAmount: number): number {
  return Math.round(baseAmount * (1 + CREDIT_COMMISSION_RATE) * 100) / 100;
}

export const CREDIT_PAYMENT_NOTE =
  'في حال عدم توفر ماستر كارد أو زين كاش، يمكنك شراء كارت رصيد والتقاط صورة له وإرساله في المحادثة. تنبيه: الدفع بالرصيد يضيف 40% على السعر النهائي كعمولة بيع واستقطاع الرصيد لاحقاً.';
