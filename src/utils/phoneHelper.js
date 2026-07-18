const IRAQ_COUNTRY_CODE = '964';
const LOCAL_PATTERN = /^07[789]\d{8}$/;

const CARRIER_PREFIXES = {
  77: 'Asiacell',
  78: 'Zain Iraq',
  79: 'Korek Telecom',
};

function stripFormatting(raw) {
  return String(raw ?? '').trim().replace(/[\s\-()]/g, '');
}

export function normalizeIraqiPhone(raw) {
  let digits = stripFormatting(raw).replace(/^\+/, '');

  if (digits.startsWith(`00${IRAQ_COUNTRY_CODE}`)) {
    digits = digits.slice(2);
  }
  if (digits.startsWith(IRAQ_COUNTRY_CODE)) {
    digits = `0${digits.slice(IRAQ_COUNTRY_CODE.length)}`;
  }
  if (!digits.startsWith('0') && digits.startsWith('7')) {
    digits = `0${digits}`;
  }

  return digits;
}

export function isValidIraqiPhone(raw) {
  return LOCAL_PATTERN.test(normalizeIraqiPhone(raw));
}

export function toLocalFormat(raw) {
  const digits = normalizeIraqiPhone(raw);
  return LOCAL_PATTERN.test(digits) ? digits : null;
}

export function toE164(raw) {
  const local = toLocalFormat(raw);
  return local ? `+${IRAQ_COUNTRY_CODE}${local.slice(1)}` : null;
}

export function formatForDisplay(raw) {
  const local = toLocalFormat(raw);
  if (!local) return raw;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function getCarrier(raw) {
  const local = toLocalFormat(raw);
  if (!local) return null;
  return CARRIER_PREFIXES[local.slice(1, 3)] ?? 'Other';
}
