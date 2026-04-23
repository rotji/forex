import { Router, Request, Response } from "express";
import { getSignalEngineStatus } from "../../jobs/signalEngineState";
import { runSignalEngineCycle } from "../../jobs/signalEngineScheduler";
import { env } from "../../config/env";
import { createOpsRunAudit, listRecentOpsRunAudit } from "./ops.service";
import { getDb } from "../../config/database";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  const status = getSignalEngineStatus();
  let dbReachable = true;

  try {
    getDb().prepare("SELECT 1 AS ok").get();
  } catch (_err: unknown) {
    dbReachable = false;
  }

  const nowMs = Date.now();
  const lastCompletedAtMs = status.lastCompletedAt ? new Date(status.lastCompletedAt).getTime() : null;
  const lastCycleAgeSeconds =
    lastCompletedAtMs && Number.isFinite(lastCompletedAtMs)
      ? Math.max(0, Math.floor((nowMs - lastCompletedAtMs) / 1000))
      : null;
  const intervalSeconds =
    status.intervalMs != null && status.intervalMs > 0 ? Math.floor(status.intervalMs / 1000) : null;
  const staleThresholdSeconds = intervalSeconds != null ? intervalSeconds * 2 : null;
  const stale =
    lastCycleAgeSeconds != null && staleThresholdSeconds != null
      ? lastCycleAgeSeconds > staleThresholdSeconds
      : false;

  let healthReason: string | null = null;
  if (!dbReachable) {
    healthReason = "Database is unreachable";
  } else if (!status.running) {
    healthReason = "Scheduler is disabled";
  } else if (stale) {
    healthReason = "Signal engine cycle is stale";
  } else if (status.lastError) {
    healthReason = "Last signal engine cycle failed";
  }

  const healthy = !healthReason;

  return res.json({
    healthy,
    dbReachable,
    schedulerEnabled: status.running,
    intervalMs: status.intervalMs,
    lastCompletedAt: status.lastCompletedAt,
    lastCycleAgeSeconds,
    stale,
    staleThresholdSeconds,
    lastDurationMs: status.lastDurationMs,
    lastError: status.lastError,
    healthReason,
    opsRunKeyConfigured: env.OPS_RUN_KEY.trim().length > 0,
  });
});

router.get("/signal-engine", (_req: Request, res: Response) => {
  res.json(getSignalEngineStatus());
});

router.get("/signal-engine/runs", (req: Request, res: Response) => {
  const limitValue = req.query.limit;
  const parsedLimit = typeof limitValue === "string" ? Number.parseInt(limitValue, 10) : 5;
  const rows = listRecentOpsRunAudit(parsedLimit);
  res.json(rows);
});

router.post("/signal-engine/run-now", (req: Request, res: Response) => {
  const requestedAt = new Date().toISOString();
  const requestIp = req.ip;
  const configuredKey = env.OPS_RUN_KEY.trim();
  if (!configuredKey) {
    createOpsRunAudit({
      triggerSource: "MANUAL_API",
      requestedAt,
      completedAt: new Date().toISOString(),
      success: false,
      message: "OPS_RUN_KEY is not configured",
      requestIp,
    });
    return res.status(503).json({ error: "OPS_RUN_KEY is not configured" });
  }

  const providedKey = req.header("x-ops-run-key")?.trim() ?? "";
  if (providedKey !== configuredKey) {
    createOpsRunAudit({
      triggerSource: "MANUAL_API",
      requestedAt,
      completedAt: new Date().toISOString(),
      success: false,
      message: "Invalid operations key",
      requestIp,
    });
    return res.status(401).json({ error: "Invalid operations key" });
  }

  const result = runSignalEngineCycle();
  createOpsRunAudit({
    triggerSource: "MANUAL_API",
    requestedAt,
    completedAt: result.completedAt,
    success: result.success,
    message: result.error ?? "Signal engine cycle completed",
    expiredCount: result.expiredCount,
    cleanedCount: result.cleanedCount,
    biasCount: result.biasCount,
    generatedAlertsCount: result.generatedAlertsCount,
    durationMs: result.durationMs,
    requestIp,
  });

  if (!result.success) {
    return res.status(500).json({
      error: result.error ?? "Signal engine cycle failed",
      result,
      status: getSignalEngineStatus(),
    });
  }

  return res.json({
    message: "Signal engine cycle completed",
    result,
    status: getSignalEngineStatus(),
  });
});

export default router;
