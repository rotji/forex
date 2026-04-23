import { getDb } from "../../config/database";

export function getLatestMacroIndicators(limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM macro_indicators
       ORDER BY released_at DESC
       LIMIT ?`
    )
    .all(limit);
}

export function getMacroIndicatorsByCurrency(currency: string, limit = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM macro_indicators
       WHERE currency = ?
       ORDER BY released_at DESC
       LIMIT ?`
    )
    .all(currency.toUpperCase(), limit);
}
