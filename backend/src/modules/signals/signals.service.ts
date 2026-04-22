import { getDb } from "../../config/database";

export function getActiveSignals() {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM signals
       WHERE is_active = 1
       ORDER BY generated_at DESC`
    )
    .all();
}

export function getSignalsByPair(pairSymbol: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM signals
       WHERE pair_symbol = ? AND is_active = 1
       ORDER BY generated_at DESC`
    )
    .all(pairSymbol.toUpperCase());
}
