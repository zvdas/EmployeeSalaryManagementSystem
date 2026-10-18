import { fromIsoDate, toIsoDate } from './dates';

describe('toIsoDate', () => {
  it('uses local calendar parts, not UTC', () => {
    // Local midnight is the previous day in UTC for any timezone east of Greenwich.
    expect(toIsoDate(new Date(2024, 0, 1, 0, 0))).toBe('2024-01-01');
    // Late evening is the next day in UTC for any timezone west of Greenwich.
    expect(toIsoDate(new Date(2024, 11, 31, 23, 59))).toBe('2024-12-31');
  });

  it('zero-pads month and day', () => {
    expect(toIsoDate(new Date(2023, 2, 5))).toBe('2023-03-05');
  });
});

describe('fromIsoDate', () => {
  it('returns local midnight of the given day', () => {
    const date = fromIsoDate('2022-03-01');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2022, 2, 1, 0,
    ]);
  });

  it('round-trips with toIsoDate', () => {
    for (const iso of ['2020-02-29', '1999-12-31', '2026-10-18']) {
      expect(toIsoDate(fromIsoDate(iso))).toBe(iso);
    }
  });
});
