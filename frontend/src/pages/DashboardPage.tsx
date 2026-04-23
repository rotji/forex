import { useCallback, useEffect, useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { currenciesService } from "../services/currencies.service";
import { pairsService } from "../services/pairs.service";
import { signalsService } from "../services/signals.service";
import { setupsService } from "../services/setups.service";
import { currencyBiasService } from "../services/currency-bias.service";
import { alertsService } from "../services/alerts.service";
import { opsService } from "../services/ops.service";
import type {
  Currency,
  CurrencyPair,
  Signal,
  TradeSetup,
  CurrencyBiasSnapshot,
  TradeAlert,
  CurrencyBiasHistoryMap,
  OpsHealthSummary,
  OpsRunAuditRecord,
  SignalEngineStatus,
} from "../types";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const [opsRunKey, setOpsRunKey] = useState("");
  const [runningNow, setRunningNow] = useState(false);
  const [runNowMessage, setRunNowMessage] = useState<string | null>(null);
  const [runNowError, setRunNowError] = useState<string | null>(null);
  const [opsAutoRefreshEnabled, setOpsAutoRefreshEnabled] = useState(true);

  const fetchCurrencies = useCallback(() => currenciesService.getAll(), []);
  const fetchPairs = useCallback(() => pairsService.getMajors(), []);
  const fetchSignals = useCallback(() => signalsService.getActive(), []);
  const fetchSetups = useCallback(() => setupsService.getActive(), []);
  const fetchBias = useCallback(() => currencyBiasService.getLatest(), []);
  const fetchBiasHistory = useCallback(() => currencyBiasService.getHistoryMap(8), []);
  const fetchAlerts = useCallback(() => alertsService.getActive(), []);
  const fetchSignalEngineStatus = useCallback(() => opsService.getSignalEngineStatus(), []);
  const fetchOpsHealth = useCallback(() => opsService.getHealthSummary(), []);
  const fetchSignalEngineRuns = useCallback(() => opsService.getRecentSignalEngineRuns(5), []);

  const currencies = useQuery<Currency[]>(fetchCurrencies);
  const pairs = useQuery<CurrencyPair[]>(fetchPairs);
  const signals = useQuery<Signal[]>(fetchSignals);
  const setups = useQuery<TradeSetup[]>(fetchSetups);
  const bias = useQuery<CurrencyBiasSnapshot[]>(fetchBias);
  const biasHistory = useQuery<CurrencyBiasHistoryMap>(fetchBiasHistory);
  const alerts = useQuery<TradeAlert[]>(fetchAlerts);
  const signalEngine = useQuery<SignalEngineStatus>(fetchSignalEngineStatus);
  const opsHealth = useQuery<OpsHealthSummary>(fetchOpsHealth);
  const signalRuns = useQuery<OpsRunAuditRecord[]>(fetchSignalEngineRuns);

  const strongest = (bias.data ?? []).slice(0, 3);
  const weakest = [...(bias.data ?? [])].slice(-3).reverse();
  const topAlerts = (alerts.data ?? []).slice(0, 3);

  function sparklinePoints(currency: string): string {
    const rows = (biasHistory.data?.[currency] ?? []).slice().reverse();
    if (rows.length < 2) return "";
    const width = 96;
    const height = 28;
    return rows
      .map((row, i) => {
        const x = (i / (rows.length - 1)) * width;
        const y = ((1 - (row.score + 1) / 2) * (height - 4)) + 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const stats = [
    { label: "Currencies", value: currencies.data?.length ?? "—" },
    { label: "Major Pairs", value: pairs.data?.length ?? "—" },
    { label: "Active Signals", value: signals.data?.length ?? "—" },
    { label: "Active Setups", value: setups.data?.length ?? "—" },
    { label: "Active Alerts", value: alerts.data?.length ?? "—" },
  ];

  const backendOnline = !currencies.error;

  async function handleRunNow(): Promise<void> {
    if (!opsRunKey.trim()) {
      setRunNowError("Enter operations key");
      setRunNowMessage(null);
      return;
    }

    try {
      setRunningNow(true);
      setRunNowError(null);
      setRunNowMessage(null);
      const result = await opsService.runSignalEngineNow(opsRunKey.trim());
      setRunNowMessage(result.message);
      opsHealth.refetch();
      signalEngine.refetch();
      signalRuns.refetch();
      alerts.refetch();
      bias.refetch();
    } catch (err: unknown) {
      setRunNowError(err instanceof Error ? err.message : "Failed to run signal engine cycle");
      setRunNowMessage(null);
    } finally {
      setRunningNow(false);
    }
  }

  useEffect(() => {
    if (!opsAutoRefreshEnabled) {
      return;
    }

    const refreshIntervalMs = 15000;
    const timerId = window.setInterval(() => {
      opsHealth.refetch();
      signalEngine.refetch();
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [opsAutoRefreshEnabled, opsHealth.refetch, signalEngine.refetch]);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dashboard</h1>
      <p className={styles.sub}>Global Currency Intelligence Platform — live overview</p>

      <span className={`${styles.statusBadge} ${backendOnline ? styles.online : styles.offline}`}>
        <span>{backendOnline ? "●" : "●"}</span>
        {backendOnline ? "Backend Online" : "Backend Offline"}
      </span>

      <div className={styles.statsGrid} style={{ marginTop: "1.5rem" }}>
        {stats.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.insightsGrid}>
        <section className={styles.insightCard}>
          <h2 className={styles.insightTitle}>Strongest Currencies</h2>
          {strongest.length === 0 ? (
            <p className={styles.meta}>No bias data yet.</p>
          ) : (
            <ul className={styles.biasList}>
              {strongest.map((row) => (
                <li key={row.id} className={styles.biasItem}>
                  <div>
                    <span className={styles.code}>{row.currency}</span>
                    {sparklinePoints(row.currency) && (
                      <svg className={styles.sparkline} viewBox="0 0 96 28" aria-label={`${row.currency} trend`}>
                        <polyline points={sparklinePoints(row.currency)} fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    )}
                  </div>
                  <span className={styles.score}>{row.score.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.insightCard}>
          <h2 className={styles.insightTitle}>Weakest Currencies</h2>
          {weakest.length === 0 ? (
            <p className={styles.meta}>No bias data yet.</p>
          ) : (
            <ul className={styles.biasList}>
              {weakest.map((row) => (
                <li key={row.id} className={styles.biasItem}>
                  <div>
                    <span className={styles.code}>{row.currency}</span>
                    {sparklinePoints(row.currency) && (
                      <svg className={styles.sparkline} viewBox="0 0 96 28" aria-label={`${row.currency} trend`}>
                        <polyline points={sparklinePoints(row.currency)} fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    )}
                  </div>
                  <span className={styles.score}>{row.score.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.insightCard}>
          <h2 className={styles.insightTitle}>Top Active Alerts</h2>
          {topAlerts.length === 0 ? (
            <p className={styles.meta}>No active alerts.</p>
          ) : (
            <ul className={styles.alertList}>
              {topAlerts.map((row) => (
                <li key={row.id} className={styles.alertItem}>
                  <div>
                    <span className={styles.code}>{row.pair_symbol}</span>
                    <div className={styles.meta}>{row.direction} · {(row.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <span className={styles.alertArrow}>{row.direction === "BUY" ? "↗" : row.direction === "SELL" ? "↘" : "→"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.insightCard}>
          <div className={styles.opsHeader}>
            <h2 className={styles.insightTitle}>Operations</h2>
            <div className={styles.opsActions}>
              <button
                type="button"
                className={styles.opsRefreshButton}
                onClick={opsHealth.refetch}
                disabled={opsHealth.loading}
              >
                {opsHealth.loading ? "Refreshing..." : "Health"}
              </button>
              <button
                type="button"
                className={styles.opsRefreshButton}
                onClick={signalEngine.refetch}
                disabled={signalEngine.loading}
              >
                {signalEngine.loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                className={styles.opsRefreshButton}
                onClick={() => setOpsAutoRefreshEnabled((prev) => !prev)}
              >
                {opsAutoRefreshEnabled ? "Pause Auto" : "Resume Auto"}
              </button>
            </div>
          </div>
          <div className={styles.runNowControls}>
            <input
              type="password"
              value={opsRunKey}
              onChange={(e) => setOpsRunKey(e.target.value)}
              placeholder="Ops run key"
              className={styles.opsKeyInput}
            />
            <button
              type="button"
              className={styles.opsRunButton}
              onClick={handleRunNow}
              disabled={runningNow || !opsRunKey.trim()}
            >
              {runningNow ? "Running..." : "Run Now"}
            </button>
          </div>
          {runNowMessage && <p className={styles.opsSuccess}>{runNowMessage}</p>}
          {runNowError && <p className={styles.opsError}>{runNowError}</p>}
          {opsHealth.error && <p className={styles.opsError}>Failed to load operations health.</p>}
          {opsHealth.data && (
            <>
              <div className={styles.healthHeaderRow}>
                <h3 className={styles.auditTitle}>Health</h3>
                <span
                  className={
                    opsHealth.data.healthy
                      ? styles.healthGood
                      : opsHealth.data.stale
                        ? styles.healthWarn
                        : styles.healthBad
                  }
                >
                  {opsHealth.data.healthy ? "HEALTHY" : opsHealth.data.stale ? "STALE" : "CHECK"}
                </span>
              </div>
              {opsHealth.data.healthReason && <p className={styles.opsWarning}>{opsHealth.data.healthReason}</p>}
              <p className={styles.opsMeta}>
                Auto-refresh {opsAutoRefreshEnabled ? "ON" : "OFF"} (15s).
              </p>
              <ul className={styles.healthList}>
                <li className={styles.opsItem}><span>Database</span><strong>{opsHealth.data.dbReachable ? "Reachable" : "Unreachable"}</strong></li>
                <li className={styles.opsItem}><span>Scheduler</span><strong>{opsHealth.data.schedulerEnabled ? "Enabled" : "Disabled"}</strong></li>
                <li className={styles.opsItem}><span>Last Cycle Age</span><strong>{opsHealth.data.lastCycleAgeSeconds != null ? `${opsHealth.data.lastCycleAgeSeconds}s` : "-"}</strong></li>
                <li className={styles.opsItem}><span>Stale Threshold</span><strong>{opsHealth.data.staleThresholdSeconds != null ? `${opsHealth.data.staleThresholdSeconds}s` : "-"}</strong></li>
                <li className={styles.opsItem}><span>Run Key</span><strong>{opsHealth.data.opsRunKeyConfigured ? "Configured" : "Missing"}</strong></li>
              </ul>
            </>
          )}
          {signalEngine.error && <p className={styles.opsError}>Failed to refresh operations telemetry.</p>}
          {!signalEngine.data ? (
            <p className={styles.meta}>No signal engine status available.</p>
          ) : (
            <ul className={styles.opsList}>
              <li className={styles.opsItem}><span>Running</span><strong>{signalEngine.data.running ? "Yes" : "No"}</strong></li>
              <li className={styles.opsItem}><span>Last Run</span><strong>{signalEngine.data.lastCompletedAt ? new Date(signalEngine.data.lastCompletedAt).toLocaleString() : "-"}</strong></li>
              <li className={styles.opsItem}><span>Duration</span><strong>{signalEngine.data.lastDurationMs != null ? `${signalEngine.data.lastDurationMs} ms` : "-"}</strong></li>
              <li className={styles.opsItem}><span>Alerts Generated</span><strong>{signalEngine.data.lastGeneratedAlertsCount}</strong></li>
              <li className={styles.opsItem}><span>Expired Marked</span><strong>{signalEngine.data.lastExpiredCount}</strong></li>
              <li className={styles.opsItem}><span>Archived Deleted</span><strong>{signalEngine.data.lastCleanedCount}</strong></li>
              <li className={styles.opsItem}><span>Interval</span><strong>{signalEngine.data.intervalMs != null ? `${signalEngine.data.intervalMs} ms` : "-"}</strong></li>
              {signalEngine.data.lastError && (
                <li className={styles.opsItem}><span>Last Error</span><strong className={styles.errorText}>{signalEngine.data.lastError}</strong></li>
              )}
            </ul>
          )}

          <div className={styles.auditHeaderRow}>
            <h3 className={styles.auditTitle}>Recent Manual Runs</h3>
            <button
              type="button"
              className={styles.opsRefreshButton}
              onClick={signalRuns.refetch}
              disabled={signalRuns.loading}
            >
              {signalRuns.loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {!signalRuns.data || signalRuns.data.length === 0 ? (
            <p className={styles.meta}>No manual runs yet.</p>
          ) : (
            <ul className={styles.auditList}>
              {signalRuns.data.map((run) => (
                <li key={run.id} className={styles.auditItem}>
                  <div className={styles.auditRowTop}>
                    <span className={run.success ? styles.auditSuccess : styles.auditFailure}>
                      {run.success ? "SUCCESS" : "FAIL"}
                    </span>
                    <span className={styles.meta}>{new Date(run.requested_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.auditCounts}>
                    <span>Alerts {run.generated_alerts_count ?? 0}</span>
                    <span>Bias {run.bias_count ?? 0}</span>
                    <span>Cleaned {run.cleaned_count ?? 0}</span>
                    <span>Duration {run.duration_ms ?? 0} ms</span>
                  </div>
                  {run.message && <div className={styles.meta}>{run.message}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
