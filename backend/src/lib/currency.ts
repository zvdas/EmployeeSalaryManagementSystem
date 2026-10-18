/** Whole currency units: every amount the API returns is rounded to an integer. */
export function roundMoney(amount: number): number {
  return Math.round(amount);
}

/** Converts a local amount to USD (`usdRate` = USD value of one local unit), rounded. */
export function toUsd(amount: number, usdRate: number): number {
  return roundMoney(amount * usdRate);
}
