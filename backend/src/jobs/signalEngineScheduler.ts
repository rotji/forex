import { recomputeCurrencyBiases } from "../modules/currency-bias/currency-bias.service";
import {
  cleanupExpiredTradeAlerts,
  expireStaleTradeAlerts,
  generateTradeAlertsFromBiases,
} from "../modules/trade-alerts/trade-alerts.service";
import { env } from "../config/env";
import {
  markSignalEngineCycleError,
  markSignalEngineCycleStart,
  markSignalEngineCycleSuccess,
  markSignalEngineRunning,
} from "./signalEngineState";

export interface SignalEngineCycleResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  expiredCount: number;
  cleanedCount: number;
  biasCount: number;
  generatedAlertsCount: number;
  error: string | null;
}

export function runSignalEngineCycle(): SignalEngineCycleResult {
  const startedAt = new Date();
  const startedAtIso = startedAt.toISOString();
  markSignalEngineCycleStart(startedAtIso);
  try {
    const expired = expireStaleTradeAlerts();
    const cleaned = cleanupExpiredTradeAlerts(env.ALERT_ARCHIVE_RETENTION_DAYS);
    const biasRows = recomputeCurrencyBiases();
    const alerts = generateTradeAlertsFromBiases();
    const completedAt = new Date();
    const completedAtIso = completedAt.toISOString();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    markSignalEngineCycleSuccess({
      completedAt: completedAtIso,
      durationMs,
      expiredCount: expired,
      cleanedCount: cleaned,
      biasCount: biasRows.length,
      generatedAlertsCount: alerts.length,
    });
    console.log(`[signal-engine] expired ${expired} stale alerts, cleaned ${cleaned} archived alerts, recomputed ${biasRows.length} currency biases, generated ${alerts.length} alerts`);
    return {
      success: true,
      startedAt: startedAtIso,
      completedAt: completedAtIso,
      durationMs,
      expiredCount: expired,
      cleanedCount: cleaned,
      biasCount: biasRows.length,
      generatedAlertsCount: alerts.length,
      error: null,
    };
  } catch (err: unknown) {
    const completedAt = new Date();
    const msg = err instanceof Error ? err.message : "Unknown signal engine error";
    markSignalEngineCycleError(msg);
    console.error(`[signal-engine] cycle failed: ${msg}`);
    return {
      success: false,
      startedAt: startedAtIso,
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      expiredCount: 0,
      cleanedCount: 0,
      biasCount: 0,
      generatedAlertsCount: 0,
      error: msg,
    };
  }
}

export function startSignalEngineScheduler(intervalMs: number): void {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    console.log("[signal-engine] scheduler disabled");
    return;
  }

  markSignalEngineRunning(intervalMs);
  runSignalEngineCycle();
  setInterval(runSignalEngineCycle, intervalMs);
  console.log(`[signal-engine] scheduler running every ${intervalMs} ms`);
}
