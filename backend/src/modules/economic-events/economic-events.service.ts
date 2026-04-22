import { getDb } from "../../config/database";

export function getUpcomingEvents(limit = 20) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM economic_events
       WHERE scheduled_at >= datetime('now')
       ORDER BY scheduled_at ASC
       LIMIT ?`
    )
    .all(limit);
}

export function getEventsByCurrency(currency: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM economic_events
       WHERE currency = ?
       ORDER BY scheduled_at DESC`
    )
    .all(currency.toUpperCase());
}

export function getHighImpactEvents() {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM economic_events
       WHERE impact = 'HIGH' AND scheduled_at >= datetime('now')
       ORDER BY scheduled_at ASC`
    )
    .all();
}
