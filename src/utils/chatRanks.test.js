import { getRank, RANKS } from './chatRanks';

describe('getRank', () => {
  it('assigns "new" for a brand-new member with zero messages', () => {
    expect(getRank(0).id).toBe('new');
  });

  it('stays "new" right up to the boundary below "persistent"', () => {
    expect(getRank(9).id).toBe('new');
  });

  it('promotes to "persistent" exactly at its threshold', () => {
    expect(getRank(10).id).toBe('persistent');
    expect(getRank(29).id).toBe('persistent');
  });

  it('promotes to "active" exactly at its threshold', () => {
    expect(getRank(30).id).toBe('active');
    expect(getRank(79).id).toBe('active');
  });

  it('promotes to "enthusiast" exactly at its threshold', () => {
    expect(getRank(80).id).toBe('enthusiast');
    expect(getRank(199).id).toBe('enthusiast');
  });

  it('promotes to "legend" exactly at its threshold and beyond', () => {
    expect(getRank(200).id).toBe('legend');
    expect(getRank(5000).id).toBe('legend');
  });

  it('falls back to the lowest rank for a negative count', () => {
    expect(getRank(-1).id).toBe('new');
  });

  it('every rank carries both Arabic and Kurdish labels', () => {
    for (const rank of RANKS) {
      expect(rank.label.ar).toEqual(expect.any(String));
      expect(rank.label.ckb).toEqual(expect.any(String));
      expect(rank.label.ar.length).toBeGreaterThan(0);
      expect(rank.label.ckb.length).toBeGreaterThan(0);
    }
  });
});
