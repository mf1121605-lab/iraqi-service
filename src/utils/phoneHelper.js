// Iraqi mobile numbers: 07XXXXXXXXX (11 digits, starts with 07, second digit
// is one of 3-9). We accept the number with or without the +964 country code
// prefix and normalize to E.164 (+9647XXXXXXXXX) for Supabase Auth.
const IRAQI_MOBILE_RE = /^(?:\+?964|0)?7[3-9]\d{8}$/;

export function isValidIraqiPhone(input) {
  if (!input || typeof input !== 'string') return false;
  return IRAQI_MOBILE_RE.test(input.replace(/[\s-]/g, ''));
}

export function toE164(input) {
  const cleaned = (input || '').replace(/[\s-]/g, '').replace(/^\+964/, '0');
  if (!cleaned.startsWith('0')) return input;
  return `+964${cleaned.slice(1)}`;
}
