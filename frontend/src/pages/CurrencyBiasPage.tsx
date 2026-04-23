import { useCallback, useMemo, useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { currencyBiasService } from "../services/currency-bias.service";
import type { CurrencyBiasSnapshot } from "../types";
import styles from "./EventsPage.module.css";

const biasClass: Record<string, string> = {
  BULLISH: styles.low,
  NEUTRAL: styles.medium,
  BEARISH: styles.high,
};

export function CurrencyBiasPage() {
  const fetcher = useCallback(() => currencyBiasService.getLatest(), []);
  const { data, loading, error, refetch } = useQuery<CurrencyBiasSnapshot[]>(fetcher);
  const [searchText, setSearchText] = useState("");
  const [recomputing, setRecomputing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      return !q || row.currency.toLowerCase().includes(q) || (row.drivers ?? "").toLowerCase().includes(q);
    });
  }, [data, searchText]);

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
            {filtered.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.currency}</strong></td>
                <td>
                  <span className={`${styles.impact} ${biasClass[row.bias] ?? ""}`}>{row.bias}</span>
                </td>
                <td>{row.score.toFixed(2)}</td>
                <td>{(row.confidence * 100).toFixed(0)}%</td>
                <td>{row.drivers ?? "-"}</td>
                <td>{new Date(row.computed_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
