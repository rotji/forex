import { getDb } from "../../config/database";

export interface OpsRunAuditRecord {
  id: number;
  trigger_source: string;
  requested_at: string;
  completed_at: string | null;
  success: number;
  message: string | null;
  expired_count: number | null;
  cleaned_count: number | null;
  bias_count: number | null;
  generated_alerts_count: number | null;
  duration_ms: number | null;
  request_ip: string | null;
}

export interface CreateOpsRunAuditInput {
  triggerSource: string;
  requestedAt: string;
  completedAt?: string | null;
  success: boolean;
  message?: string | null;
  expiredCount?: number | null;
  cleanedCount?: number | null;
  biasCount?: number | null;
  generatedAlertsCount?: number | null;
  durationMs?: number | null;
  requestIp?: string | null;
}

export function createOpsRunAudit(input: CreateOpsRunAuditInput): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO ops_run_audit (
      trigger_source,
      requested_at,
      completed_at,
      success,
      message,
      expired_count,
      cleaned_count,
      bias_count,
      generated_alerts_count,
      duration_ms,
      request_ip
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.triggerSource,
    input.requestedAt,
    input.completedAt ?? null,
    input.success ? 1 : 0,
    input.message ?? null,
    input.expiredCount ?? null,
    input.cleanedCount ?? null,
    input.biasCount ?? null,
    input.generatedAlertsCount ?? null,
    input.durationMs ?? null,
    input.requestIp ?? null,
  );

  return Number(result.lastInsertRowid);
}

export function listRecentOpsRunAudit(limit = 5): OpsRunAuditRecord[] {
  const db = getDb();
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 5;
  const stmt = db.prepare(`
    SELECT
      id,
      trigger_source,
      requested_at,
      completed_at,
      success,
      message,
      expired_count,
      cleaned_count,
      bias_count,
      generated_alerts_count,
      duration_ms,
      request_ip
    FROM ops_run_audit
    ORDER BY requested_at DESC
    LIMIT ?
  `);

  return stmt.all(normalizedLimit) as OpsRunAuditRecord[];
}
