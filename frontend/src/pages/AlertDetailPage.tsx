import { useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "../hooks/useQuery";
import { alertsService } from "../services/alerts.service";
import { currencyBiasService } from "../services/currency-bias.service";
import type { BiasBreakdown, CurrencyBiasSnapshot, TradeAlert } from "../types";
import styles from "./EventsPage.module.css";

const directionClass: Record<string, string> = {
  BUY: styles.low,
  SELL: styles.high,
  NEUTRAL: styles.medium,
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

function BreakdownCard({ currency, snapshot }: { currency: string; snapshot: CurrencyBiasSnapshot | null }) {
  const bd = snapshot ? parseBreakdown(snapshot.breakdown) : null;

  if (!snapshot) {
    return (
      <section className={styles.filterCard}>
        <h3 className={styles.filterTitle}>{currency}</h3>
        <p className={styles.meta}>No bias snapshot available for this currency.</p>
      </section>
    );
  }

  if (!bd) {
    return (
      <section className={styles.filterCard}>
        <h3 className={styles.filterTitle}>{currency}</h3>
        <p className={styles.meta}>Score: {snapshot.score.toFixed(2)} ({snapshot.bias})</p>
        <p className={styles.meta}>Breakdown not available. Run Recompute Bias to populate.</p>
      </section>
    );
  }

  const total = bd.macro + bd.events + bd.centralBank + bd.riskSentiment + bd.positioning;

  return (
    <section className={styles.filterCard}>
      <h3 className={styles.filterTitle}>
        {currency} — {snapshot.score.toFixed(2)} ({snapshot.bias})
      </h3>
      <p className={styles.meta}>Confidence: {(snapshot.confidence * 100).toFixed(0)}%</p>
      <div style={{ marginTop: "0.75rem" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.55rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Score Breakdown
        </p>
        <BreakdownBar label="Macro indicators" value={bd.macro} />
        <BreakdownBar label="Economic events" value={bd.events} />
        <BreakdownBar label="Central bank tone" value={bd.centralBank} />
        <BreakdownBar label="Risk sentiment" value={bd.riskSentiment} />
        <BreakdownBar label="Positioning" value={bd.positioning} />
        <div style={{ marginTop: "0.45rem", borderTop: "1px solid var(--border)", paddingTop: "0.45rem" }}>
          <BreakdownBar label="Total (pre-clamp)" value={total} />
        </div>
      </div>
      {snapshot.drivers && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <strong>Top drivers:</strong> {snapshot.drivers}
        </p>
      )}
    </section>
  );
}

export function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const alertId = useMemo(() => (id ? parseInt(id, 10) : null), [id]);

  const fetchAlert = useCallback(() => (alertId ? alertsService.getById(alertId) : Promise.reject(new Error("No alert ID"))), [alertId]);
  const fetchBias = useCallback(() => currencyBiasService.getLatest(), []);

  const alert = useQuery<TradeAlert>(fetchAlert);
  const bias = useQuery<CurrencyBiasSnapshot[]>(fetchBias);

  const baseBias = useMemo(
    () => (bias.data ?? []).find((row) => row.currency === alert.data?.base_currency),
    [bias.data, alert.data?.base_currency],
  );
  const quoteBias = useMemo(
    () => (bias.data ?? []).find((row) => row.currency === alert.data?.quote_currency),
    [bias.data, alert.data?.quote_currency],
  );

  if (!alertId) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Alert Not Found</h1>
        <p className={styles.error}>Invalid alert ID.</p>
      </div>
    );
  }

  if (alert.loading || bias.loading) {
    return <p>Loading alert details...</p>;
  }

  if (alert.error) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Alert Not Found</h1>
        <p className={styles.error}>Error: {alert.error}</p>
        <button className={styles.button} onClick={() => navigate("/alerts")}>
          Back to Alerts
        </button>
      </div>
    );
  }

  if (!alert.data) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Alert Not Found</h1>
        <button className={styles.button} onClick={() => navigate("/alerts")}>
          Back to Alerts
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.buttonSecondary} onClick={() => navigate("/alerts")} style={{ marginBottom: "1rem" }}>
        ← Back to Alerts
      </button>

      <h1 className={styles.heading}>{alert.data.pair_symbol}</h1>
      <p className={styles.sub}>Alert triggered {new Date(alert.data.triggered_at).toLocaleString()}</p>

      <section className={styles.formCard}>
        <h2 className={styles.formTitle}>Alert Summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Direction
            </p>
            <p>
              <span className={`${styles.impact} ${directionClass[alert.data.direction] ?? ""}`}>
                {alert.data.direction}
              </span>
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Confidence
            </p>
            <p style={{ fontSize: "1.2rem", fontWeight: 700 }}>{(alert.data.confidence * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Status
            </p>
            <p>{alert.data.status}</p>
          </div>
          <div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Expires
            </p>
            <p>{alert.data.expires_at ? new Date(alert.data.expires_at).toLocaleString() : "—"}</p>
          </div>
        </div>
        {alert.data.rationale && (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.35rem" }}>
              Rationale
            </p>
            <p>{alert.data.rationale}</p>
          </div>
        )}
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 className={styles.filterTitle}>Score Divergence</h2>
        <p className={styles.meta} style={{ marginBottom: "1rem" }}>
          <strong>{alert.data.base_currency}</strong> bias: {alert.data.base_score?.toFixed(2) ?? "—"} · <strong>{alert.data.quote_currency}</strong> bias: {alert.data.quote_score?.toFixed(2) ?? "—"} · Divergence: {alert.data.score_diff?.toFixed(2) ?? "—"}
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem", marginTop: "1.5rem" }}>
        <BreakdownCard currency={alert.data.base_currency ?? "Base"} snapshot={baseBias ?? null} />
        <BreakdownCard currency={alert.data.quote_currency ?? "Quote"} snapshot={quoteBias ?? null} />
      </div>
    </div>
  );
}
