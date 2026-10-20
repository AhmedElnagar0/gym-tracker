import { fromUnix, nowUnix, toUnix } from './time';

describe('unix time helpers', () => {
  it('converts dates to whole seconds, not milliseconds', () => {
    expect(toUnix(new Date('2026-10-20T12:00:00.999Z'))).toBe(1792497600);
  });

  it('round-trips seconds through a Date', () => {
    expect(toUnix(fromUnix(1792497600))).toBe(1792497600);
  });

  it('returns an integer close to Date.now() / 1000', () => {
    const n = nowUnix();
    expect(Number.isInteger(n)).toBe(true);
    expect(Math.abs(n - Date.now() / 1000)).toBeLessThan(2);
  });
});
