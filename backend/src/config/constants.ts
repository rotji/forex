export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD",
  "SGD", "HKD", "SEK", "NOK", "DKK", "ZAR", "MXN", "BRL",
] as const;

export const MAJOR_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF",
  "AUD/USD", "USD/CAD", "NZD/USD",
] as const;

export const SIGNAL_TYPES = ["BUY", "SELL", "NEUTRAL"] as const;

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"] as const;
