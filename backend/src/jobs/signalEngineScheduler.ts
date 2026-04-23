import { recomputeCurrencyBiases } from "../modules/currency-bias/currency-bias.service";
import {
  cleanupExpiredTradeAlerts,
  expireStaleTradeAlerts,
  generateTradeAlertsFromBiases,
} from "../modules/trade-alerts/trade-alerts.service";
import { runIngestionCycle } from "../modules/ingestion/ingestion.service";
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
  ingestionProvider: string;
  ingestionAt: string;
  ingestionFetchedAt: string | null;
  ingestionMacroInserted: number;
  ingestionMacroUpdated: number;
  ingestionMacroSkipped: number;
  ingestionCbInserted: number;
  ingestionCbUpdated: number;
  ingestionCbSkipped: number;
  ingestionError: string | null;
  expiredCount: number;
  cleanedCount: number;
  biasCount: number;
  generatedAlertsCount: number;
  error: string | null;
}

export async function runSignalEngineCycle(): Promise<SignalEngineCycleResult> {
  const startedAt = new Date();
  const startedAtIso = startedAt.toISOString();
  markSignalEngineCycleStart(startedAtIso);
  try {
    const ingestionResult = await runIngestionCycle();
    const ingestionAt = new Date().toISOString();
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
      ingestionAt,
      ingestionProvider: ingestionResult.provider,
      ingestionFetchedAt: ingestionResult.fetchedAt,
      ingestionMacroInserted: ingestionResult.macroInserted,
      ingestionMacroUpdated: ingestionResult.macroUpdated,
      ingestionMacroSkipped: ingestionResult.macroSkipped,
      ingestionCbInserted: ingestionResult.cbInserted,
      ingestionCbUpdated: ingestionResult.cbUpdated,
      ingestionCbSkipped: ingestionResult.cbSkipped,
      ingestionError: ingestionResult.error,
      expiredCount: expired,
      cleanedCount: cleaned,
      biasCount: biasRows.length,
      generatedAlertsCount: alerts.length,
    });
    console.log(`\n[signal-engine] cycle summary (${durationMs}ms)`);
    console.log(`  ingestion: provider=${ingestionResult.provider} inserted=${ingestionResult.macroInserted + ingestionResult.cbInserted} updated=${ingestionResult.macroUpdated + ingestionResult.cbUpdated} skipped=${ingestionResult.macroSkipped + ingestionResult.cbSkipped} err=${ingestionResult.error ?? "none"}`);
    console.log(`  alerts: expired ${expired} stale, cleaned ${cleaned} archived, generated ${alerts.length} new`);
    console.log(`  biases: recomputed ${biasRows.length} currencies\n`);
    return {
      success: true,
      startedAt: startedAtIso,
      completedAt: completedAtIso,
      durationMs,
      ingestionProvider: ingestionResult.provider,
      ingestionAt,
      ingestionFetchedAt: ingestionResult.fetchedAt,
      ingestionMacroInserted: ingestionResult.macroInserted,
      ingestionMacroUpdated: ingestionResult.macroUpdated,
      ingestionMacroSkipped: ingestionResult.macroSkipped,
      ingestionCbInserted: ingestionResult.cbInserted,
      ingestionCbUpdated: ingestionResult.cbUpdated,
      ingestionCbSkipped: ingestionResult.cbSkipped,
      ingestionError: ingestionResult.error,
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
      ingestionProvider: "unknown",
      ingestionAt: completedAt.toISOString(),
      ingestionFetchedAt: null,
      ingestionMacroInserted: 0,
      ingestionMacroUpdated: 0,
      ingestionMacroSkipped: 0,
      ingestionCbInserted: 0,
      ingestionCbUpdated: 0,
      ingestionCbSkipped: 0,
      ingestionError: null,
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
  void runSignalEngineCycle();
  setInterval(() => {
    void runSignalEngineCycle();
  }, intervalMs);
  console.log(`[signal-engine] scheduler running every ${intervalMs} ms`);
}
