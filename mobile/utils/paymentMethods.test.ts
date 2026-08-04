import { creditFinalAmount, CREDIT_COMMISSION_RATE } from './paymentMethods';

describe('creditFinalAmount', () => {
  it('adds the 40% commission on a round number', () => {
    expect(creditFinalAmount(50000)).toBe(70000);
  });

  it('adds the 40% commission on a small amount', () => {
    expect(creditFinalAmount(1000)).toBe(1400);
  });

  it('rounds correctly for a value with cents', () => {
    expect(creditFinalAmount(99.99)).toBe(139.99);
  });

  it('returns 0 for a base amount of 0', () => {
    expect(creditFinalAmount(0)).toBe(0);
  });

  it('matches the documented commission rate constant', () => {
    expect(CREDIT_COMMISSION_RATE).toBe(0.4);
    expect(creditFinalAmount(100)).toBe(100 * (1 + CREDIT_COMMISSION_RATE));
  });
});
