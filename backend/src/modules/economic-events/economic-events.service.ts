import { getDb } from "../../config/database";

interface CreateEconomicEventInput {
  title: string;
  currency: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  scheduledAt: string;
  actualValue?: string | null;
  forecastValue?: string | null;
  previousValue?: string | null;
  source?: string | null;
}

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

export function createEconomicEvent(input: CreateEconomicEventInput) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO economic_events (
        title,
        currency,
        impact,
        scheduled_at,
        actual_value,
        forecast_value,
        previous_value,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title,
      input.currency.toUpperCase(),
      input.impact,
      input.scheduledAt,
      input.actualValue ?? null,
      input.forecastValue ?? null,
      input.previousValue ?? null,
      input.source ?? null
    );

  const id = Number(result.lastInsertRowid);
  return db.prepare("SELECT * FROM economic_events WHERE id = ?").get(id);
}

interface UpdateEconomicEventInput {
  title?: string;
  currency?: string;
  impact?: "LOW" | "MEDIUM" | "HIGH";
  scheduledAt?: string;
  actualValue?: string | null;
  forecastValue?: string | null;
  previousValue?: string | null;
  source?: string | null;
}

export function updateEconomicEvent(id: number, input: UpdateEconomicEventInput) {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) { fields.push("title = ?"); values.push(input.title); }
  if (input.currency !== undefined) { fields.push("currency = ?"); values.push(input.currency.toUpperCase()); }
  if (input.impact !== undefined) { fields.push("impact = ?"); values.push(input.impact); }
  if (input.scheduledAt !== undefined) { fields.push("scheduled_at = ?"); values.push(input.scheduledAt); }
  if ("actualValue" in input) { fields.push("actual_value = ?"); values.push(input.actualValue ?? null); }
  if ("forecastValue" in input) { fields.push("forecast_value = ?"); values.push(input.forecastValue ?? null); }
  if ("previousValue" in input) { fields.push("previous_value = ?"); values.push(input.previousValue ?? null); }
  if ("source" in input) { fields.push("source = ?"); values.push(input.source ?? null); }

  if (fields.length === 0) return db.prepare("SELECT * FROM economic_events WHERE id = ?").get(id);

  values.push(id);
  db.prepare(`UPDATE economic_events SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return db.prepare("SELECT * FROM economic_events WHERE id = ?").get(id);
}

export function deleteEconomicEvent(id: number) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM economic_events WHERE id = ?").get(id);
  if (!existing) return false;
  db.prepare("DELETE FROM economic_events WHERE id = ?").run(id);
  return true;
}
