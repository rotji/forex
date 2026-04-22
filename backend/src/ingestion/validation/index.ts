// Input validation helpers for ingestion pipelines.

export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export function isValidPairSymbol(symbol: string): boolean {
  return /^[A-Z]{3}\/[A-Z]{3}$/.test(symbol);
}

export function isValidISODate(value: string): boolean {
  return !isNaN(Date.parse(value));
}
