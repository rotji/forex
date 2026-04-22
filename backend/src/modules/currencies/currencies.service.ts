import { getDb } from "../../config/database";

export function getAllCurrencies() {
  const db = getDb();
  return db.prepare("SELECT * FROM currencies WHERE is_active = 1 ORDER BY code").all();
}

export function getCurrencyByCode(code: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM currencies WHERE code = ?").get(code.toUpperCase());
}
