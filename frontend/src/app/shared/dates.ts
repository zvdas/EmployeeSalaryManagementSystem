const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * `YYYY-MM-DD` from the date's LOCAL calendar parts. `toISOString()` would convert to UTC first,
 * shifting dates picked east of Greenwich back by a day.
 */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of a `YYYY-MM-DD` string (`new Date('YYYY-MM-DD')` would be UTC midnight). */
export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}
