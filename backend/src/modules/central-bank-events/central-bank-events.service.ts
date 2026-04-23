import { getDb } from "../../config/database";

export function getUpcomingCentralBankEvents(limit = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM central_bank_events
       WHERE scheduled_at >= datetime('now')
       ORDER BY scheduled_at ASC
       LIMIT ?`
    )
    .all(limit);
}

export function getCentralBankEventsByCurrency(currency: string, limit = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM central_bank_events
       WHERE currency = ?
       ORDER BY scheduled_at DESC
       LIMIT ?`
    )
    .all(currency.toUpperCase(), limit);
}
