import { Pipe, PipeTransform } from '@angular/core';

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/** Whole-unit currency formatting, e.g. `formatMoney(1234567, 'INR')` → "₹1,234,567". */
export function formatMoney(amount: number, currency = 'USD'): string {
  return formatterFor(currency).format(amount);
}

/** `{{ salary | money: 'EUR' }}`; renders nothing for a missing amount. */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency = 'USD'): string {
    return amount === null || amount === undefined ? '' : formatMoney(amount, currency);
  }
}
