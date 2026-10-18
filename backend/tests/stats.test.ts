import { describe, expect, it } from 'vitest';
import { histogram, iqrOutliers, median, percentile, quartiles } from '../src/lib/stats.js';

describe('median', () => {
  it.each([
    [[], 0],
    [[5], 5],
    [[1, 3, 5], 3],
    [[1, 2, 3, 4], 2.5],
    [[10, 10, 20, 90], 15],
  ])('median(%j) = %d', (values, expected) => {
    expect(median(values)).toBe(expected);
  });
});

describe('percentile / quartiles', () => {
  it('interpolates linearly between closest ranks', () => {
    const values = [10, 20, 30, 40, 50];

    expect(percentile(values, 0)).toBe(10);
    expect(percentile(values, 0.25)).toBe(20); // rank 1
    expect(percentile(values, 1)).toBe(50);
    expect(percentile([1, 2, 3, 4], 0.25)).toBe(1.75); // rank 0.75
  });

  it('returns 0 for no data', () => {
    expect(percentile([], 0.9)).toBe(0);
    expect(quartiles([])).toEqual({ q1: 0, q3: 0 });
  });

  it('computes q1 and q3', () => {
    expect(quartiles([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({ q1: 3, q3: 7 });
  });
});

describe('histogram', () => {
  it('returns no buckets for no data', () => {
    expect(histogram([], 10)).toEqual([]);
  });

  it('puts identical values in a single bucket', () => {
    expect(histogram([7, 7, 7], 4)).toEqual([{ min: 7, max: 7, count: 3 }]);
  });

  it('splits min..max into equal-width buckets whose counts sum to n', () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const buckets = histogram(values, 5);

    expect(buckets).toEqual([
      { min: 0, max: 2, count: 2 }, // 0, 1
      { min: 2, max: 4, count: 2 }, // 2, 3
      { min: 4, max: 6, count: 2 }, // 4, 5
      { min: 6, max: 8, count: 2 }, // 6, 7
      { min: 8, max: 10, count: 3 }, // 8, 9 and the max, 10
    ]);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(values.length);
  });

  it('covers min..max exactly with contiguous buckets', () => {
    const values = [3, 17, 18, 40, 41, 99.5];

    const buckets = histogram(values, 7);

    expect(buckets).toHaveLength(7);
    expect(buckets[0]?.min).toBe(3);
    expect(buckets.at(-1)?.max).toBe(99.5);
    buckets.slice(1).forEach((b, i) => expect(b.min).toBe(buckets[i]?.max));
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(values.length);
  });
});

describe('iqrOutliers', () => {
  it('flags values above q3 + 1.5 × IQR', () => {
    // q1 = 3, q3 = 7, IQR = 4, fences at 3 - 6 = -3 and 7 + 6 = 13.
    expect(iqrOutliers([1, 2, 3, 4, 5, 6, 7, 8, 100])).toEqual({
      lowThreshold: -3,
      highThreshold: 13,
      lowCount: 0,
      highCount: 1,
    });
  });

  it('flags values below q1 - 1.5 × IQR', () => {
    // q1 = 2, q3 = 6, IQR = 4, fences at -4 and 12.
    expect(iqrOutliers([-100, 1, 2, 3, 4, 5, 6, 7, 8])).toEqual({
      lowThreshold: -4,
      highThreshold: 12,
      lowCount: 1,
      highCount: 0,
    });
  });

  it('does not count values sitting exactly on a threshold', () => {
    expect(iqrOutliers([5, 5, 5, 5])).toEqual({
      lowThreshold: 5,
      highThreshold: 5,
      lowCount: 0,
      highCount: 0,
    });
  });

  it('returns zeros for no data', () => {
    expect(iqrOutliers([])).toEqual({
      lowThreshold: 0,
      highThreshold: 0,
      lowCount: 0,
      highCount: 0,
    });
  });
});
