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

export interface CreateCentralBankEventInput {
  bank_code: string;
  bank_name: string;
  title: string;
  event_type: "RATE_DECISION" | "SPEECH" | "MINUTES" | "PRESS_CONFERENCE" | "INTERVENTION";
  currency: string;
  scheduled_at: string;
  expected_value?: string | null;
  actual_value?: string | null;
  outcome_tone?: "DOVISH" | "NEUTRAL" | "HAWKISH" | null;
  source?: string | null;
}

export function createCentralBankEvent(input: CreateCentralBankEventInput) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO central_bank_events
         (bank_code, bank_name, title, event_type, currency, scheduled_at,
          expected_value, actual_value, outcome_tone, source,
          source_provider, source_id, ingested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', NULL, NULL)`
    )
    .run(
      input.bank_code,
      input.bank_name,
      input.title,
      input.event_type,
      input.currency.toUpperCase(),
      input.scheduled_at,
      input.expected_value ?? null,
      input.actual_value ?? null,
      input.outcome_tone ?? null,
      input.source ?? null,
    );
  return db.prepare(`SELECT * FROM central_bank_events WHERE id = ?`).get(result.lastInsertRowid);
}

export interface UpdateCentralBankEventInput {
  bank_code?: string;
  bank_name?: string;
  title?: string;
  event_type?: "RATE_DECISION" | "SPEECH" | "MINUTES" | "PRESS_CONFERENCE" | "INTERVENTION";
  currency?: string;
  scheduled_at?: string;
  expected_value?: string | null;
  actual_value?: string | null;
  outcome_tone?: "DOVISH" | "NEUTRAL" | "HAWKISH" | null;
  source?: string | null;
}

export function updateCentralBankEvent(id: number, input: UpdateCentralBankEventInput) {
  const db = getDb();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.bank_code !== undefined) { fields.push("bank_code = ?"); params.push(input.bank_code); }
  if (input.bank_name !== undefined) { fields.push("bank_name = ?"); params.push(input.bank_name); }
  if (input.title !== undefined) { fields.push("title = ?"); params.push(input.title); }
  if (input.event_type !== undefined) { fields.push("event_type = ?"); params.push(input.event_type); }
  if (input.currency !== undefined) { fields.push("currency = ?"); params.push(input.currency.toUpperCase()); }
  if (input.scheduled_at !== undefined) { fields.push("scheduled_at = ?"); params.push(input.scheduled_at); }
  if (input.expected_value !== undefined) { fields.push("expected_value = ?"); params.push(input.expected_value); }
  if (input.actual_value !== undefined) { fields.push("actual_value = ?"); params.push(input.actual_value); }
  if (input.outcome_tone !== undefined) { fields.push("outcome_tone = ?"); params.push(input.outcome_tone); }
  if (input.source !== undefined) { fields.push("source = ?"); params.push(input.source); }

  if (fields.length === 0) return db.prepare(`SELECT * FROM central_bank_events WHERE id = ?`).get(id);

  params.push(id);
  db.prepare(`UPDATE central_bank_events SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  return db.prepare(`SELECT * FROM central_bank_events WHERE id = ?`).get(id);
}

export function deleteCentralBankEvent(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM central_bank_events WHERE id = ?`).run(id);
  return result.changes > 0;
}
