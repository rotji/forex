import { useCallback } from "react";
import { useQuery } from "../hooks/useQuery";
import { setupsService } from "../services/setups.service";
import type { TradeSetup } from "../types";
import styles from "./EventsPage.module.css";

const statusColor: Record<string, string> = {
  PENDING: styles.medium,
  ACTIVE: styles.low,
  HIT_TP: styles.low,
  HIT_SL: styles.high,
  CANCELLED: styles.high,
};

export function SetupsPage() {
  const fetcher = useCallback(() => setupsService.getActive(), []);
  const { data, loading, error } = useQuery<TradeSetup[]>(fetcher);

  if (loading) return <p>Loading trade setups…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Trade Setups</h1>
      <p className={styles.sub}>{data?.length ?? 0} active setups</p>
      {data?.length === 0 ? (
        <p>No trade setups available.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Entry</th>
              <th>Stop Loss</th>
              <th>TP1</th>
              <th>TP2</th>
              <th>R:R</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.id}>
                <td>{s.pair_symbol}</td>
                <td>{s.entry_price}</td>
                <td>{s.stop_loss}</td>
                <td>{s.take_profit_1}</td>
                <td>{s.take_profit_2 ?? "—"}</td>
                <td>{s.risk_reward_ratio ?? "—"}</td>
                <td>
                  <span className={`${styles.impact} ${statusColor[s.status] ?? ""}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
