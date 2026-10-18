// Pure statistics helpers. Functions taking `sorted` expect values in ascending order
// (the repositories return them sorted by SQL) and return 0 / empty results for no data.

export interface Bucket {
  min: number;
  max: number;
  count: number;
}

export interface Outliers {
  lowThreshold: number;
  highThreshold: number;
  lowCount: number;
  highCount: number;
}

/** Percentile with linear interpolation between closest ranks (p in [0, 1]). */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = (sorted.length - 1) * p;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? 0;
  return lowerValue + (upperValue - lowerValue) * (rank - lower);
}

export function median(sorted: readonly number[]): number {
  return percentile(sorted, 0.5);
}

export function quartiles(sorted: readonly number[]): { q1: number; q3: number } {
  return { q1: percentile(sorted, 0.25), q3: percentile(sorted, 0.75) };
}

/**
 * Splits [min, max] of the data into `bucketCount` equal-width buckets. Each bucket includes
 * its lower bound; the last one also includes the overall max, so counts always sum to n.
 */
export function histogram(sorted: readonly number[], bucketCount: number): Bucket[] {
  const min = sorted[0];
  const max = sorted.at(-1);
  if (min === undefined || max === undefined) return [];
  if (min === max) return [{ min, max, count: sorted.length }];

  const width = (max - min) / bucketCount;
  const buckets: Bucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    min: min + i * width,
    max: i === bucketCount - 1 ? max : min + (i + 1) * width,
    count: 0,
  }));

  for (const value of sorted) {
    const index = Math.min(Math.floor((value - min) / width), bucketCount - 1);
    const bucket = buckets[index];
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

/** Tukey's rule: values beyond 1.5 × IQR from the quartiles are outliers. */
export function iqrOutliers(sorted: readonly number[]): Outliers {
  if (sorted.length === 0) return { lowThreshold: 0, highThreshold: 0, lowCount: 0, highCount: 0 };

  const { q1, q3 } = quartiles(sorted);
  const fence = 1.5 * (q3 - q1);
  const lowThreshold = q1 - fence;
  const highThreshold = q3 + fence;
  return {
    lowThreshold,
    highThreshold,
    lowCount: sorted.filter((v) => v < lowThreshold).length,
    highCount: sorted.filter((v) => v > highThreshold).length,
  };
}
