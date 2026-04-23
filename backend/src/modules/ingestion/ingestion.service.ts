import { getDb } from "../../config/database";
import { fetchIngestionPayloadFromProviders, type IngestionPayload } from "../../ingestion/api";
import { isValidCurrencyCode, isValidISODate } from "../../ingestion/validation";

interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface IngestionCycleResult {
  success: boolean;
  provider: string;
  startedAt: string;
  completedAt: string;
  fetchedAt: string | null;
  macroInserted: number;
  macroUpdated: number;
  macroSkipped: number;
  cbInserted: number;
  cbUpdated: number;
  cbSkipped: number;
  error: string | null;
}

function upsertMacroIndicators(payload: IngestionPayload): UpsertResult {
  const db = getDb();
  const existingStmt = db.prepare(
    `SELECT id FROM macro_indicators WHERE source_provider = ? AND source_id = ? LIMIT 1`
  );
  const upsertStmt = db.prepare(
    `INSERT INTO macro_indicators (
      indicator_code,
      indicator_name,
      currency,
      value,
      previous_value,
      forecast_value,
      unit,
      importance,
      signal_direction,
      period,
      released_at,
      source,
      source_provider,
      source_id,
      ingested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_provider, source_id)
    DO UPDATE SET
      indicator_code = excluded.indicator_code,
      indicator_name = excluded.indicator_name,
      currency = excluded.currency,
      value = excluded.value,
      previous_value = excluded.previous_value,
      forecast_value = excluded.forecast_value,
      unit = excluded.unit,
      importance = excluded.importance,
      signal_direction = excluded.signal_direction,
      period = excluded.period,
      released_at = excluded.released_at,
      source = excluded.source,
      ingested_at = excluded.ingested_at`
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of payload.macroIndicators) {
    if (!isValidCurrencyCode(row.currency.toUpperCase()) || !isValidISODate(row.releasedAt)) {
      skipped += 1;
      continue;
    }

    const existing = existingStmt.get(row.sourceProvider, row.sourceId) as { id: number } | undefined;
    upsertStmt.run(
      row.indicatorCode,
      row.indicatorName,
      row.currency.toUpperCase(),
      row.value,
      row.previousValue,
      row.forecastValue,
      row.unit,
      row.importance,
      row.signalDirection,
      row.period,
      row.releasedAt,
      row.source,
      row.sourceProvider,
      row.sourceId,
      payload.fetchedAt,
    );

    if (existing) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  return { inserted, updated, skipped };
}

function upsertCentralBankEvents(payload: IngestionPayload): UpsertResult {
  const db = getDb();
  const existingStmt = db.prepare(
    `SELECT id FROM central_bank_events WHERE source_provider = ? AND source_id = ? LIMIT 1`
  );
  const upsertStmt = db.prepare(
    `INSERT INTO central_bank_events (
      bank_code,
      bank_name,
      title,
      event_type,
      currency,
      scheduled_at,
      expected_value,
      actual_value,
      outcome_tone,
      source,
      source_provider,
      source_id,
      ingested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_provider, source_id)
    DO UPDATE SET
      bank_code = excluded.bank_code,
      bank_name = excluded.bank_name,
      title = excluded.title,
      event_type = excluded.event_type,
      currency = excluded.currency,
      scheduled_at = excluded.scheduled_at,
      expected_value = excluded.expected_value,
      actual_value = excluded.actual_value,
      outcome_tone = excluded.outcome_tone,
      source = excluded.source,
      ingested_at = excluded.ingested_at`
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of payload.centralBankEvents) {
    if (!isValidCurrencyCode(row.currency.toUpperCase()) || !isValidISODate(row.scheduledAt)) {
      skipped += 1;
      continue;
    }

    const existing = existingStmt.get(row.sourceProvider, row.sourceId) as { id: number } | undefined;
    upsertStmt.run(
      row.bankCode,
      row.bankName,
      row.title,
      row.eventType,
      row.currency.toUpperCase(),
      row.scheduledAt,
      row.expectedValue,
      row.actualValue,
      row.outcomeTone,
      row.source,
      row.sourceProvider,
      row.sourceId,
      payload.fetchedAt,
    );

    if (existing) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  return { inserted, updated, skipped };
}

function insertIngestionRun(result: IngestionCycleResult): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO ingestion_runs (
      provider,
      started_at,
      completed_at,
      success,
      macro_inserted,
      macro_updated,
      macro_skipped,
      cb_inserted,
      cb_updated,
      cb_skipped,
      error_message,
      fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    result.provider,
    result.startedAt,
    result.completedAt,
    result.success ? 1 : 0,
    result.macroInserted,
    result.macroUpdated,
    result.macroSkipped,
    result.cbInserted,
    result.cbUpdated,
    result.cbSkipped,
    result.error,
    result.fetchedAt,
  );
}

export function getLatestIngestionRun() {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM ingestion_runs
       ORDER BY started_at DESC
       LIMIT 1`
    )
    .get();
}

export function listRecentIngestionRuns(limit = 5) {
  const db = getDb();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 5;
  return db
    .prepare(
      `SELECT * FROM ingestion_runs
       ORDER BY started_at DESC
       LIMIT ?`
    )
    .all(safeLimit);
}

export async function runIngestionCycle(): Promise<IngestionCycleResult> {
  const startedAt = new Date().toISOString();
  try {
    const payload = await fetchIngestionPayloadFromProviders();
    const db = getDb();

    const transactionResult = db.transaction(() => {
      const macro = upsertMacroIndicators(payload);
      const cb = upsertCentralBankEvents(payload);
      return { macro, cb };
    })();

    const result: IngestionCycleResult = {
      success: true,
      provider: payload.provider,
      startedAt,
      completedAt: new Date().toISOString(),
      fetchedAt: payload.fetchedAt,
      macroInserted: transactionResult.macro.inserted,
      macroUpdated: transactionResult.macro.updated,
      macroSkipped: transactionResult.macro.skipped,
      cbInserted: transactionResult.cb.inserted,
      cbUpdated: transactionResult.cb.updated,
      cbSkipped: transactionResult.cb.skipped,
      error: null,
    };

    insertIngestionRun(result);
    return result;
  } catch (err: unknown) {
    const result: IngestionCycleResult = {
      success: false,
      provider: "unknown",
      startedAt,
      completedAt: new Date().toISOString(),
      fetchedAt: null,
      macroInserted: 0,
      macroUpdated: 0,
      macroSkipped: 0,
      cbInserted: 0,
      cbUpdated: 0,
      cbSkipped: 0,
      error: err instanceof Error ? err.message : "Unknown ingestion error",
    };
    insertIngestionRun(result);
    return result;
  }
}
