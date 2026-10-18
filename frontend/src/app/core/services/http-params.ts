import { HttpParams } from '@angular/common/http';

export type QueryValue = string | number | null | undefined;

/**
 * Builds `HttpParams` from a plain object, keeping only meaningful values:
 * `undefined`, `null` and blank strings are omitted so the API applies its defaults.
 */
export function toHttpParams(query: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query) as [string, QueryValue][]) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text !== '') params = params.set(key, text);
  }
  return params;
}
