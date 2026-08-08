import {
  normalizeIraqiPhone,
  isValidIraqiPhone,
  toLocalFormat,
  toE164,
  formatForDisplay,
  getCarrier,
} from './phoneHelper';

describe('normalizeIraqiPhone', () => {
  it('leaves an already-local number unchanged', () => {
    expect(normalizeIraqiPhone('07712345678')).toBe('07712345678');
  });

  it('converts E.164 (+964) to local format', () => {
    expect(normalizeIraqiPhone('+9647712345678')).toBe('07712345678');
  });

  it('converts the 00964 international prefix to local format', () => {
    expect(normalizeIraqiPhone('009647712345678')).toBe('07712345678');
  });

  it('adds the missing leading 0 when the user drops it', () => {
    expect(normalizeIraqiPhone('7712345678')).toBe('07712345678');
  });

  it('strips spaces, dashes, and parentheses before normalizing', () => {
    expect(normalizeIraqiPhone('077 123-45(678)')).toBe('07712345678');
  });
});

describe('isValidIraqiPhone', () => {
  it.each(['07712345678', '07812345678', '07912345678'])(
    'accepts a valid %s number for each of the three carriers',
    (number) => {
      expect(isValidIraqiPhone(number)).toBe(true);
    }
  );

  it('rejects a prefix outside 077/078/079', () => {
    expect(isValidIraqiPhone('07612345678')).toBe(false);
  });

  it('rejects numbers that are too short', () => {
    expect(isValidIraqiPhone('0771234')).toBe(false);
  });

  it('rejects numbers that are too long', () => {
    expect(isValidIraqiPhone('077123456789')).toBe(false);
  });

  it('rejects empty, null, and undefined input', () => {
    expect(isValidIraqiPhone('')).toBe(false);
    expect(isValidIraqiPhone(null)).toBe(false);
    expect(isValidIraqiPhone(undefined)).toBe(false);
  });

  it('accepts an E.164-formatted valid number', () => {
    expect(isValidIraqiPhone('+9647912345678')).toBe(true);
  });
});

describe('toLocalFormat', () => {
  it('returns the local-format string for a valid number', () => {
    expect(toLocalFormat('+9647712345678')).toBe('07712345678');
  });

  it('returns null for an invalid number', () => {
    expect(toLocalFormat('12345')).toBeNull();
  });
});

describe('toE164', () => {
  it('converts a valid local number to +964 format', () => {
    expect(toE164('07712345678')).toBe('+9647712345678');
  });

  it('returns null for an invalid number', () => {
    expect(toE164('not-a-phone')).toBeNull();
  });
});

describe('formatForDisplay', () => {
  it('groups a valid local number as 0XXX XXX XXXX', () => {
    expect(formatForDisplay('07712345678')).toBe('0771 234 5678');
  });

  it('returns the raw input unchanged when invalid', () => {
    expect(formatForDisplay('abc')).toBe('abc');
  });
});

describe('getCarrier', () => {
  it('identifies Asiacell (077)', () => {
    expect(getCarrier('07712345678')).toBe('Asiacell');
  });

  it('identifies Zain Iraq (078)', () => {
    expect(getCarrier('07812345678')).toBe('Zain Iraq');
  });

  it('identifies Korek Telecom (079)', () => {
    expect(getCarrier('07912345678')).toBe('Korek Telecom');
  });

  it('returns null for an invalid number', () => {
    expect(getCarrier('123')).toBeNull();
  });
});
