export type CsvValue = string | number | null | undefined;

/** Line terminator required by RFC 4180. */
export const CSV_LINE_END = '\r\n';

/** Byte-order mark that makes Excel read a CSV file as UTF-8. */
export const UTF8_BOM = String.fromCharCode(0xfeff);

// Spreadsheet apps execute text cells starting with these characters as formulas.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const NEEDS_QUOTING = /[",\r\n]/;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);

  const text = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Formats one CSV record (without its line terminator), safe to open in Excel. */
export function toCsvRow(values: readonly CsvValue[]): string {
  return values.map(escapeCell).join(',');
}
