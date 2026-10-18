import { describe, expect, it } from 'vitest';
import { toCsvRow } from '../src/lib/csv.js';

describe('toCsvRow', () => {
  it('joins plain values with commas', () => {
    expect(toCsvRow(['EMP-000001', 'Ada Lovelace', 100000, 0.5])).toBe(
      'EMP-000001,Ada Lovelace,100000,0.5',
    );
  });

  it('writes null and undefined as empty cells', () => {
    expect(toCsvRow(['a', null, undefined, 'b'])).toBe('a,,,b');
  });

  it.each([
    ['Lovelace, Ada', '"Lovelace, Ada"'],
    ['The "Countess"', '"The ""Countess"""'],
    ['line one\nline two', '"line one\nline two"'],
    ['carriage\rreturn', '"carriage\rreturn"'],
  ])('quotes %j per RFC 4180', (value, expected) => {
    expect(toCsvRow([value])).toBe(expected);
  });

  it.each([
    ['=SUM(A1:A9)', "'=SUM(A1:A9)"],
    ['+1 555 0100', "'+1 555 0100"],
    ['-2+3', "'-2+3"],
    ['@cmd', "'@cmd"],
    ['\tTabbed', "'\tTabbed"],
    ['=HYPERLINK("http://x", "go")', `"'=HYPERLINK(""http://x"", ""go"")"`],
  ])('neutralises the formula %j', (value, expected) => {
    expect(toCsvRow([value])).toBe(expected);
  });

  it('leaves numbers alone, including negatives', () => {
    expect(toCsvRow([-5, 0])).toBe('-5,0');
  });

  it('only treats a leading character as a formula', () => {
    expect(toCsvRow(['a=b', 'mary-jane@x.io'])).toBe('a=b,mary-jane@x.io');
  });
});
