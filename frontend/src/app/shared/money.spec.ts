import { formatMoney, MoneyPipe } from './money';

describe('formatMoney', () => {
  it('formats whole units with the currency symbol', () => {
    expect(formatMoney(1234567, 'USD')).toBe('$1,234,567');
    expect(formatMoney(85000, 'EUR')).toBe('€85,000');
    expect(formatMoney(3000000, 'INR')).toBe('₹3,000,000');
  });

  it('rounds away minor units', () => {
    expect(formatMoney(999.6, 'USD')).toBe('$1,000');
  });

  it('defaults to USD', () => {
    expect(formatMoney(50)).toBe('$50');
  });
});

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('formats with the given currency', () => {
    expect(pipe.transform(72000, 'GBP')).toBe('£72,000');
    expect(pipe.transform(0)).toBe('$0');
  });

  it('renders nothing for missing values', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined, 'USD')).toBe('');
  });
});
