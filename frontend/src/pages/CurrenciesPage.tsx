import { useCallback } from "react";
import { useQuery } from "../hooks/useQuery";
import { currenciesService } from "../services/currencies.service";
import type { Currency } from "../types";
import styles from "./CurrenciesPage.module.css";

export function CurrenciesPage() {
  const fetcher = useCallback(() => currenciesService.getAll(), []);
  const { data, loading, error } = useQuery<Currency[]>(fetcher);

  if (loading) return <p>Loading currencies…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Currencies</h1>
      <p className={styles.sub}>{data?.length ?? 0} supported currencies</p>
      <div className={styles.grid}>
        {data?.map((c) => (
          <div key={c.id} className={styles.card}>
            <div className={styles.code}>
              {c.symbol ?? ""} {c.code}
            </div>
            <div className={styles.name}>{c.name}</div>
            {c.country && <div className={styles.country}>{c.country}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
