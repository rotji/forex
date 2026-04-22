import { getDb } from "../config/database";
import { SUPPORTED_CURRENCIES, MAJOR_PAIRS } from "../config/constants";

const CURRENCY_NAMES: Record<string, { name: string; symbol: string; country: string }> = {
  USD: { name: "US Dollar", symbol: "$", country: "United States" },
  EUR: { name: "Euro", symbol: "€", country: "Eurozone" },
  GBP: { name: "British Pound", symbol: "£", country: "United Kingdom" },
  JPY: { name: "Japanese Yen", symbol: "¥", country: "Japan" },
  CHF: { name: "Swiss Franc", symbol: "Fr", country: "Switzerland" },
  AUD: { name: "Australian Dollar", symbol: "A$", country: "Australia" },
  CAD: { name: "Canadian Dollar", symbol: "C$", country: "Canada" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$", country: "New Zealand" },
  SGD: { name: "Singapore Dollar", symbol: "S$", country: "Singapore" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$", country: "Hong Kong" },
  SEK: { name: "Swedish Krona", symbol: "kr", country: "Sweden" },
  NOK: { name: "Norwegian Krone", symbol: "kr", country: "Norway" },
  DKK: { name: "Danish Krone", symbol: "kr", country: "Denmark" },
  ZAR: { name: "South African Rand", symbol: "R", country: "South Africa" },
  MXN: { name: "Mexican Peso", symbol: "$", country: "Mexico" },
  BRL: { name: "Brazilian Real", symbol: "R$", country: "Brazil" },
};

export function runSeeds(): void {
  const db = getDb();

  const insertCurrency = db.prepare(`
    INSERT OR IGNORE INTO currencies (code, name, symbol, country)
    VALUES (@code, @name, @symbol, @country)
  `);

  const insertPair = db.prepare(`
    INSERT OR IGNORE INTO currency_pairs (base_currency, quote_currency, pair_symbol, is_major)
    VALUES (@base, @quote, @pair, @isMajor)
  `);

  const seedAll = db.transaction(() => {
    for (const code of SUPPORTED_CURRENCIES) {
      const info = CURRENCY_NAMES[code];
      if (info) insertCurrency.run({ code, ...info });
    }

    for (const pair of MAJOR_PAIRS) {
      const [base, quote] = pair.split("/");
      insertPair.run({ base, quote, pair, isMajor: 1 });
    }
  });

  seedAll();
  console.log("Seeds ran successfully.");
}
