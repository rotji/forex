import { useCallback, useMemo, useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { currencyBiasService } from "../services/currency-bias.service";
import type { BiasBreakdown, CurrencyBiasHistoryMap, CurrencyBiasSnapshot } from "../types";
import styles from "./EventsPage.module.css";

const biasClass: Record<string, string> = {
  BULLISH: styles.low,
  NEUTRAL: styles.medium,
  BEARISH: styles.high,
};

function parseBreakdown(raw: string | null): BiasBreakdown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BiasBreakdown;
  } catch {
    return null;
  }
}

interface BreakdownBarProps {
  label: string;
  value: number;
}

function BreakdownBar({ label, value }: BreakdownBarProps) {
  const MAX = 0.5;
  const halfPct = Math.min(Math.abs(value) / MAX, 1) * 50;
  const positive = value >= 0;
  const barColor = positive ? "#16a34a" : "#dc2626";
  const numColor = value > 0 ? "#16a34a" : value < 0 ? "#dc2626" : "#64748b";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
      <span style={{ width: "130px", fontSize: "0.78rem", color: "var(--text-muted)", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "9px", background: "#f1f5f9", borderRadius: "999px", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            height: "100%",
            borderRadius: "999px",
            background: barColor,
            left: positive ? "50%" : `calc(50% - ${halfPct}%)`,
            width: `${halfPct}%`,
          }}
        />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "#94a3b8" }} />
      </div>
      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: numColor, width: "44px", textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {value > 0 ? "+" : ""}{value.toFixed(3)}
      </span>
    </div>
  );
}

interface BreakdownPanelProps {
  row: CurrencyBiasSnapshot;
}

function BreakdownPanel({ row }: BreakdownPanelProps) {
  const bd = parseBreakdown(row.breakdown);

  if (!bd) {
    return (
      <td colSpan={6} style={{ padding: "0.75rem 1rem 0.9rem 2.5rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No breakdown available — run Recompute Bias to generate one.</p>
      </td>
    );
  }

  const total = bd.macro + bd.events + bd.centralBank + bd.riskSentiment + bd.positioning;

  return (
    <td colSpan={6} style={{ padding: "0.75rem 1rem 0.9rem 2.5rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ maxWidth: "560px" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.55rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Score Breakdown — {row.currency}
        </p>
        <BreakdownBar label="Macro indicators" value={bd.macro} />
        <BreakdownBar label="Economic events" value={bd.events} />
        <BreakdownBar label="Central bank tone" value={bd.centralBank} />
        <BreakdownBar label="Risk sentiment" value={bd.riskSentiment} />
        <BreakdownBar label="Positioning" value={bd.positioning} />
        <div style={{ marginTop: "0.45rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.45rem" }}>
          <BreakdownBar label="Total (pre-clamp)" value={total} />
        </div>
        {row.drivers && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            <strong>Top drivers:</strong> {row.drivers}
          </p>
        )}
      </div>
    </td>
  );
}

export function CurrencyBiasPage() {
  const fetcher = useCallback(() => currencyBiasService.getLatest(), []);
  const [trendWindow, setTrendWindow] = useState<7 | 14 | 30>(14);
  const fetchHistory = useCallback(() => currencyBiasService.getHistoryMap(trendWindow), [trendWindow]);
  const { data, loading, error, refetch } = useQuery<CurrencyBiasSnapshot[]>(fetcher);
  const history = useQuery<CurrencyBiasHistoryMap>(fetchHistory);
  const [searchText, setSearchText] = useState("");
  const [recomputing, setRecomputing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedCurrency, setExpandedCurrency] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      return !q || row.currency.toLowerCase().includes(q) || (row.drivers ?? "").toLowerCase().includes(q);
    });
  }, [data, searchText]);

  const trendRows = useMemo(() => {
    return [...filtered]
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 8);
  }, [filtered]);

  function sparklinePoints(currency: string): string {
    const rows = (history.data?.[currency] ?? []).slice().reverse();
    if (rows.length < 2) return "";

    const width = 150;
    const height = 40;

    return rows
      .map((row, i) => {
        const x = (i / (rows.length - 1)) * width;
        const y = ((1 - (row.score + 1) / 2) * (height - 6)) + 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  function trendDelta(currency: string): number | null {
    const rows = (history.data?.[currency] ?? []).slice().reverse();
    if (rows.length < 2) return null;
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (!first || !last) return null;
    return last.score - first.score;
  }

  async function handleRecompute() {
    setActionError(null);
    setActionMessage(null);
    setRecomputing(true);
    try {
      const result = await currencyBiasService.recompute();
      setActionMessage(
        `Recomputed ${result.count} currency snapshots using ${result.macroIndicatorsCount} macro indicators, ${result.economicEventsCount} economic events, ${result.centralBankEventsCount} central bank events, ${result.riskSentimentCount} risk sentiment snapshots, and ${result.positioningCount} positioning snapshots; generated ${result.generatedAlertsCount} alerts.`
      );
      refetch();
      history.refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to recompute bias.");
    } finally {
      setRecomputing(false);
    }
  }

  if (loading) return <p>Loading currency bias...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Currency Bias Engine</h1>
      <p className={styles.sub}>Ranked bias snapshot derived from macro indicators and central bank tone</p>

      <section className={styles.formCard}>
        <h2 className={styles.formTitle}>Actions</h2>
        <div className={styles.actions}>
          <button className={styles.button} type="button" onClick={() => void handleRecompute()} disabled={recomputing}>
            {recomputing ? "Recomputing..." : "Recompute Bias"}
          </button>
          <input
            className={styles.input}
            placeholder="Search currency or drivers"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        {actionMessage && <p className={styles.success}>{actionMessage}</p>}
        {actionError && <p className={styles.error}>{actionError}</p>}
      </section>

      <section className={styles.filterCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <h2 className={styles.filterTitle} style={{ marginBottom: 0 }}>
            Bias Trend Charts (Last {trendWindow} Snapshots)
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span className={styles.meta} style={{ marginTop: 0 }}>Window</span>
            <select
              className={styles.select}
              style={{ minWidth: "88px", padding: "0.42rem 0.62rem" }}
              value={trendWindow}
              onChange={(e) => setTrendWindow(Number(e.target.value) as 7 | 14 | 30)}
            >
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={30}>30</option>
            </select>
          </div>
        </div>
        {history.loading ? (
          <p className={styles.meta}>Loading trend charts...</p>
        ) : history.error ? (
          <p className={styles.error}>Trend data error: {history.error}</p>
        ) : trendRows.length === 0 ? (
          <p className={styles.meta}>No trend data available.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem" }}>
            {trendRows.map((row) => {
              const points = sparklinePoints(row.currency);
              const delta = trendDelta(row.currency);
              const deltaColor = delta == null ? "var(--text-muted)" : delta >= 0 ? "#166534" : "#991b1b";

              return (
                <div key={`${row.currency}-trend`} style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "0.6rem", background: "#ffffff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <strong>{row.currency}</strong>
                    <span className={`${styles.impact} ${biasClass[row.bias] ?? ""}`}>{row.bias}</span>
                  </div>
                  {points ? (
                    <svg viewBox="0 0 150 40" width="100%" height="42" aria-label={`${row.currency} bias trend`}>
                      <line x1="0" y1="20" x2="150" y2="20" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                      <polyline points={points} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <p className={styles.meta}>Not enough history yet.</p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                    <span className={styles.meta}>Now: {row.score.toFixed(2)}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: deltaColor }}>
                      {delta == null ? "Delta: -" : `Delta: ${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {filtered.length === 0 ? (
        <p>No currency bias rows found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Currency</th>
              <th>Bias</th>
              <th>Score</th>
              <th>Confidence</th>
              <th>Drivers</th>
              <th>Computed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const isExpanded = expandedCurrency === row.currency;
              return (
                <>
                  <tr
                    key={row.id}
                    style={{ cursor: "pointer" }}
                    title="Click to expand score breakdown"
                    onClick={() => setExpandedCurrency(isExpanded ? null : row.currency)}
                  >
                    <td>
                      <strong>{row.currency}</strong>
                      <span style={{ marginLeft: "0.4rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.impact} ${biasClass[row.bias] ?? ""}`}>{row.bias}</span>
                    </td>
                    <td>{row.score.toFixed(2)}</td>
                    <td>{(row.confidence * 100).toFixed(0)}%</td>
                    <td style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.drivers ?? "-"}
                    </td>
                    <td>{new Date(row.computed_at).toLocaleString()}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.id}-breakdown`}>
                      <BreakdownPanel row={row} />
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
