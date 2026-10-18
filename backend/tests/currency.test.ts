import { describe, expect, it } from 'vitest';
import { roundMoney, toUsd } from '../src/lib/currency.js';

describe('toUsd', () => {
  it.each([
    [100_000, 1, 100_000], // USD stays USD
    [80_000, 1.27, 101_600], // GBP; 80,000 × 1.27 is 101600.00000000001 in floating point
    [2_000_000, 0.012, 24_000], // INR
    [50_000, 1.08, 54_000], // EUR
    [1_234, 0.73, 901], // CAD: 900.82 rounds up
    [1_000, 0.0005, 1], // 0.5 rounds up
  ])('converts %d at rate %d to %d USD', (amount, rate, expected) => {
    expect(toUsd(amount, rate)).toBe(expected);
  });
});

describe('roundMoney', () => {
  it('rounds to whole units', () => {
    expect(roundMoney(57_000.4)).toBe(57_000);
    expect(roundMoney(57_000.5)).toBe(57_001);
  });
});
