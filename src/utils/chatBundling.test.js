import { isBundled, bubbleCorners } from './chatBundling';

describe('isBundled', () => {
  const base = { sender_id: 'u1', created_at: '2026-08-04T12:00:00.000Z' };

  it('returns false when either message is missing', () => {
    expect(isBundled(null, base)).toBe(false);
    expect(isBundled(base, null)).toBe(false);
  });

  it('returns false when senders differ', () => {
    const other = { sender_id: 'u2', created_at: '2026-08-04T12:00:30.000Z' };
    expect(isBundled(other, base)).toBe(false);
  });

  it('returns true for the same sender within the 2-minute window', () => {
    const next = { sender_id: 'u1', created_at: '2026-08-04T12:01:59.000Z' };
    expect(isBundled(next, base)).toBe(true);
  });

  it('returns false for the same sender once the 2-minute window has elapsed', () => {
    const next = { sender_id: 'u1', created_at: '2026-08-04T12:02:00.001Z' };
    expect(isBundled(next, base)).toBe(false);
  });
});

describe('bubbleCorners', () => {
  it('gives the full corner set to a standalone message (first and last)', () => {
    expect(bubbleCorners(true, true, true)).toBe('rounded-2xl rounded-se-2xl rounded-ee-none');
    expect(bubbleCorners(false, true, true)).toBe('rounded-2xl rounded-ss-2xl rounded-es-none');
  });

  it('flattens the tail corner for the first message of a running stack', () => {
    expect(bubbleCorners(true, true, false)).toBe('rounded-2xl rounded-se-2xl rounded-ee-md');
    expect(bubbleCorners(false, true, false)).toBe('rounded-2xl rounded-ss-2xl rounded-es-md');
  });

  it('flattens both tail-side corners for a middle message', () => {
    expect(bubbleCorners(true, false, false)).toBe('rounded-2xl rounded-se-md rounded-ee-md');
    expect(bubbleCorners(false, false, false)).toBe('rounded-2xl rounded-ss-md rounded-es-md');
  });

  it('gives the point corner back to the last message of a stack', () => {
    expect(bubbleCorners(true, false, true)).toBe('rounded-2xl rounded-se-md rounded-ee-none');
    expect(bubbleCorners(false, false, true)).toBe('rounded-2xl rounded-ss-md rounded-es-none');
  });
});
