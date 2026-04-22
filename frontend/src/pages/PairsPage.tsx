import { useCallback } from "react";
import { useQuery } from "../hooks/useQuery";
import { pairsService } from "../services/pairs.service";
import type { CurrencyPair } from "../types";
import styles from "./CurrenciesPage.module.css";

export function PairsPage() {
  const fetcher = useCallback(() => pairsService.getAll(), []);
  const { data, loading, error } = useQuery<CurrencyPair[]>(fetcher);

  if (loading) return <p>Loading pairs…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Currency Pairs</h1>
      <p className={styles.sub}>{data?.length ?? 0} tracked pairs</p>
      <div className={styles.grid}>
        {data?.map((p) => (
          <div key={p.id} className={styles.card}>
            <div className={styles.code}>{p.pair_symbol}</div>
            <div className={styles.name}>
              {p.base_currency} / {p.quote_currency}
            </div>
            {p.is_major ? (
              <div className={styles.country}>Major pair</div>
            ) : (
              <div className={styles.country}>Minor / Exotic</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
