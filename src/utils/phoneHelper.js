const IRAQ_COUNTRY_CODE = '964';
const LOCAL_PATTERN = /^07\d{9}$/;

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

// Supabase's hosted "Phone" auth provider requires a configured,
// credentialed third-party SMS provider (Twilio/etc.) just to enable
// signups at all, even when no SMS is ever meant to be sent ("Phone
// signups are disabled" otherwise). Customer auth uses Supabase's
// always-on Email provider instead, keyed off a deterministic address
// derived from the E.164 number — invisible to the user, who only ever
// sees/types their phone number. The real phone still lives in
// profiles.phone via user_metadata, same as before.
export function phoneToSyntheticEmail(e164Phone) {
  const digits = String(e164Phone ?? '').replace(/^\+/, '');
  // Supabase Cloud's hosted signup endpoint rejects email domains beyond
  // its open-source format regex — confirmed live against both a ".local"
  // TLD and a made-up-but-unregistered ".com" domain, both "is invalid".
  // Community reports of the same failure on other unregistered domains
  // (e.g. example.com) point to an undocumented deliverability/registration
  // check on Supabase's hosted layer. Using the app's own real, resolvable
  // domain instead, since that's an actual registered/DNS-backed domain —
  // nothing ever needs to receive mail here regardless.
  return `${digits}@iraqi-service.vercel.app`;
}
