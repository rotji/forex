import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { currenciesService } from "../services/currencies.service";
import { pairsService } from "../services/pairs.service";
import { signalsService } from "../services/signals.service";
import { setupsService } from "../services/setups.service";
import { currencyBiasService } from "../services/currency-bias.service";
import { alertsService } from "../services/alerts.service";
import { opsService } from "../services/ops.service";
import type {
  BiasBreakdown,
  Currency,
  CurrencyPair,
  Signal,
  TradeSetup,
  CurrencyBiasSnapshot,
  TradeAlert,
  CurrencyBiasHistoryMap,
  IngestionRunRecord,
  OpsHealthSummary,
  OpsRunAuditRecord,
  SignalEngineStatus,
} from "../types";
import styles from "./DashboardPage.module.css";

function parseBreakdown(raw: string | null): BiasBreakdown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BiasBreakdown;
  } catch {
    return null;
  }
}

function explainabilityTotal(breakdown: BiasBreakdown): number {
  return breakdown.macro + breakdown.events + breakdown.centralBank + breakdown.riskSentiment + breakdown.positioning;
}

function contributionWidth(value: number): number {
  const maxContribution = 0.5;
  return Math.min(Math.abs(value) / maxContribution, 1) * 50;
}

function formatMinutesAgo(totalMinutes: number): string {
  if (totalMinutes < 1) return "just now";
  if (totalMinutes < 60) return `${totalMinutes}m ago`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes === 0 ? `${hours}h ago` : `${hours}h ${minutes}m ago`;
  const days = Math.floor(hours / 24);
  const hourRemainder = hours % 24;
  return hourRemainder === 0 ? `${days}d ago` : `${days}d ${hourRemainder}h ago`;
}

function formatSecondsSinceMs(ms: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return `updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `updated ${hours}h ago`;
}

export function DashboardPage() {
  const [opsRunKey, setOpsRunKey] = useState("");
  const [runningNow, setRunningNow] = useState(false);
  const [ingestingNow, setIngestingNow] = useState(false);
  const [freshnessTickAt, setFreshnessTickAt] = useState(Date.now());
  const [runNowMessage, setRunNowMessage] = useState<string | null>(null);
  const [runNowError, setRunNowError] = useState<string | null>(null);
  const [ingestionMessage, setIngestionMessage] = useState<string | null>(null);
  const [ingestionError, setIngestionError] = useState<string | null>(null);
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
  const fetchIngestionRuns = useCallback(() => opsService.getRecentIngestionRuns(5), []);

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
  const ingestionRuns = useQuery<IngestionRunRecord[]>(fetchIngestionRuns);

  const strongest = (bias.data ?? []).slice(0, 3);
  const weakest = [...(bias.data ?? [])].slice(-3).reverse();
  const topAlerts = (alerts.data ?? []).slice(0, 3);
  const explainabilityRows = [...strongest.slice(0, 2), ...weakest.slice(0, 2)];
  const freshnessMinutes = useMemo(() => {
    const snapshots = bias.data ?? [];
    if (snapshots.length === 0) return null;
    const latestMs = snapshots.reduce<number>((maxMs, row) => {
      const parsed = Date.parse(row.computed_at);
      if (Number.isNaN(parsed)) return maxMs;
      return Math.max(maxMs, parsed);
    }, Number.NEGATIVE_INFINITY);
    if (!Number.isFinite(latestMs)) return null;
    return Math.max(0, Math.floor((freshnessTickAt - latestMs) / 60000));
  }, [bias.data, freshnessTickAt]);
  const missingBreakdownCount = useMemo(
    () => (bias.data ?? []).filter((row) => !parseBreakdown(row.breakdown)).length,
    [bias.data],
  );

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
      ingestionRuns.refetch();
      alerts.refetch();
      bias.refetch();
    } catch (err: unknown) {
      setRunNowError(err instanceof Error ? err.message : "Failed to run signal engine cycle");
      setRunNowMessage(null);
    } finally {
      setRunningNow(false);
    }
  }

  async function handleRunIngestionNow(): Promise<void> {
    if (!opsRunKey.trim()) {
      setIngestionError("Enter operations key");
      setIngestionMessage(null);
      return;
    }

    try {
      setIngestingNow(true);
      setIngestionError(null);
      setIngestionMessage(null);
      const result = await opsService.runIngestionNow(opsRunKey.trim());
      setIngestionMessage(result.message);
      opsHealth.refetch();
      signalEngine.refetch();
      ingestionRuns.refetch();
    } catch (err: unknown) {
      setIngestionError(err instanceof Error ? err.message : "Failed to run ingestion cycle");
      setIngestionMessage(null);
    } finally {
      setIngestingNow(false);
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
      ingestionRuns.refetch();
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [opsAutoRefreshEnabled, opsHealth.refetch, signalEngine.refetch, ingestionRuns.refetch]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setFreshnessTickAt(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

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
          <h2 className={styles.insightTitle}>Bias Explainability</h2>
          <div className={styles.badgeRow}>
            {freshnessMinutes === null ? (
              <span className={`${styles.badge} ${styles.badgeStale}`}>Recompute age unknown</span>
            ) : freshnessMinutes <= 60 ? (
              <span className={`${styles.badge} ${styles.badgeGood}`}>
                Fresh: {formatMinutesAgo(freshnessMinutes)}
              </span>
            ) : freshnessMinutes <= 240 ? (
              <span className={`${styles.badge} ${styles.badgeWarn}`}>
                Aging: {formatMinutesAgo(freshnessMinutes)}
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeStale}`}>
                Stale: {formatMinutesAgo(freshnessMinutes)}
              </span>
            )}

            {missingBreakdownCount === 0 ? (
              <span className={`${styles.badge} ${styles.badgeGood}`}>Breakdown complete</span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeWarn}`}>
                Missing breakdown: {missingBreakdownCount}
              </span>
            )}
          </div>
          <p className={styles.meta}>
            <span key={freshnessTickAt} className={styles.freshnessTimestamp}>{formatSecondsSinceMs(freshnessTickAt)}</span>.
          </p>
          {explainabilityRows.length === 0 ? (
            <p className={styles.meta}>No bias rows yet.</p>
          ) : (
            <div className={styles.explainabilityList}>
              {explainabilityRows.map((row) => {
                const breakdown = parseBreakdown(row.breakdown);
                if (!breakdown) {
                  return (
                    <article key={row.id} className={styles.explainabilityCard}>
                      <div className={styles.explainabilityHead}>
                        <strong className={styles.code}>{row.currency}</strong>
                        <span className={styles.score}>{row.score.toFixed(2)}</span>
                      </div>
                      <p className={styles.meta}>Run Recompute Bias to populate contribution bars.</p>
                    </article>
                  );
                }

                const items = [
                  { label: "Macro", value: breakdown.macro },
                  { label: "Events", value: breakdown.events },
                  { label: "Central Bank", value: breakdown.centralBank },
                  { label: "Risk", value: breakdown.riskSentiment },
                  { label: "Positioning", value: breakdown.positioning },
                ];

                return (
                  <article key={row.id} className={styles.explainabilityCard}>
                    <div className={styles.explainabilityHead}>
                      <strong className={styles.code}>{row.currency}</strong>
                      <span className={styles.score}>{row.score.toFixed(2)}</span>
                    </div>
                    <div className={styles.explainabilityBars}>
                      {items.map((item) => {
                        const widthPct = contributionWidth(item.value);
                        const positive = item.value >= 0;
                        return (
                          <div key={`${row.id}-${item.label}`} className={styles.explainabilityBarRow}>
                            <span className={styles.explainabilityLabel}>{item.label}</span>
                            <div className={styles.explainabilityTrack}>
                              <div
                                className={`${styles.explainabilityFill} ${positive ? styles.explainabilityPositive : styles.explainabilityNegative}`}
                                style={{
                                  left: positive ? "50%" : `calc(50% - ${widthPct}%)`,
                                  width: `${widthPct}%`,
                                }}
                              />
                              <div className={styles.explainabilityMidline} />
                            </div>
                            <span className={`${styles.explainabilityValue} ${positive ? styles.explainabilityPositiveText : styles.explainabilityNegativeText}`}>
                              {item.value > 0 ? "+" : ""}{item.value.toFixed(3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className={styles.explainabilityFoot}>
                      <span>Total pre-clamp</span>
                      <strong>{explainabilityTotal(breakdown).toFixed(3)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
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
          {ingestionMessage && <p className={styles.opsSuccess}>{ingestionMessage}</p>}
          {ingestionError && <p className={styles.opsError}>{ingestionError}</p>}
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
                <li className={styles.opsItem}><span>Ingestion Age</span><strong>{opsHealth.data.lastIngestionAgeSeconds != null ? `${opsHealth.data.lastIngestionAgeSeconds}s` : "-"}</strong></li>
                <li className={styles.opsItem}><span>Ingestion Provider</span><strong>{opsHealth.data.lastIngestionProvider ?? "-"}</strong></li>
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
              {signalEngine.data.lastIngestionError && (
                <li className={styles.opsItem}><span>Ingestion Error</span><strong className={styles.errorText}>{signalEngine.data.lastIngestionError}</strong></li>
              )}
            </ul>
          )}

          <div className={styles.auditHeaderRow}>
            <h3 className={styles.auditTitle}>Recent Ingestion Runs</h3>
            <div className={styles.opsActions}>
              <button
                type="button"
                className={styles.opsRunButton}
                onClick={handleRunIngestionNow}
                disabled={ingestingNow || !opsRunKey.trim()}
              >
                {ingestingNow ? "Running..." : "Run Ingestion"}
              </button>
              <button
                type="button"
                className={styles.opsRefreshButton}
                onClick={ingestionRuns.refetch}
                disabled={ingestionRuns.loading}
              >
                {ingestionRuns.loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          {!ingestionRuns.data || ingestionRuns.data.length === 0 ? (
            <p className={styles.meta}>No ingestion runs yet.</p>
          ) : (
            <ul className={styles.auditList}>
              {ingestionRuns.data.map((run) => (
                <li key={run.id} className={styles.auditItem}>
                  <div className={styles.auditRowTop}>
                    <span className={run.success ? styles.auditSuccess : styles.auditFailure}>
                      {run.success ? "SUCCESS" : "FAIL"}
                    </span>
                    <span className={styles.meta}>{new Date(run.started_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.auditCounts}>
                    <span>Provider {run.provider}</span>
                    <span>Macro +{run.macro_inserted} ~{run.macro_updated}</span>
                    <span>CB +{run.cb_inserted} ~{run.cb_updated}</span>
                    <span>Skipped {run.macro_skipped + run.cb_skipped}</span>
                  </div>
                  {run.error_message && <div className={styles.meta}>{run.error_message}</div>}
                </li>
              ))}
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
