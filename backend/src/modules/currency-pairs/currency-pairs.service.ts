import { getDb } from "../../config/database";

export function getAllPairs() {
  const db = getDb();
  return db.prepare("SELECT * FROM currency_pairs WHERE is_active = 1 ORDER BY pair_symbol").all();
}

export function getMajorPairs() {
  const db = getDb();
  return db.prepare("SELECT * FROM currency_pairs WHERE is_major = 1 AND is_active = 1").all();
}

export function getPairBySymbol(symbol: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM currency_pairs WHERE pair_symbol = ?").get(symbol.toUpperCase());
}
