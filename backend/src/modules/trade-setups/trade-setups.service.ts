import { getDb } from "../../config/database";

export function getActiveTradeSetups() {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM trade_setups
       WHERE status IN ('PENDING', 'ACTIVE')
       ORDER BY created_at DESC`
    )
    .all();
}

export function getTradeSetupsByPair(pairSymbol: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM trade_setups
       WHERE pair_symbol = ?
       ORDER BY created_at DESC`
    )
    .all(pairSymbol.toUpperCase());
}
