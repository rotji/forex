import { useCallback } from "react";
import { useQuery } from "../hooks/useQuery";
import { signalsService } from "../services/signals.service";
import type { Signal } from "../types";
import styles from "./EventsPage.module.css";

const signalColor: Record<string, string> = {
  BUY: styles.low,
  SELL: styles.high,
  NEUTRAL: styles.medium,
};

export function SignalsPage() {
  const fetcher = useCallback(() => signalsService.getActive(), []);
  const { data, loading, error } = useQuery<Signal[]>(fetcher);

  if (loading) return <p>Loading signals…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Active Signals</h1>
      <p className={styles.sub}>{data?.length ?? 0} active signals</p>
      {data?.length === 0 ? (
        <p>No active signals at this time.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Signal</th>
              <th>Timeframe</th>
              <th>Strength</th>
              <th>Generated</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.id}>
                <td>{s.pair_symbol}</td>
                <td>
                  <span className={`${styles.impact} ${signalColor[s.signal_type] ?? ""}`}>
                    {s.signal_type}
                  </span>
                </td>
                <td>{s.timeframe}</td>
                <td>{s.strength != null ? `${(s.strength * 100).toFixed(0)}%` : "—"}</td>
                <td>{new Date(s.generated_at).toLocaleString()}</td>
                <td>{s.expires_at ? new Date(s.expires_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
