import { useCallback } from "react";
import { useQuery } from "../hooks/useQuery";
import { currenciesService } from "../services/currencies.service";
import { pairsService } from "../services/pairs.service";
import { signalsService } from "../services/signals.service";
import { setupsService } from "../services/setups.service";
import type { Currency, CurrencyPair, Signal, TradeSetup } from "../types";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const fetchCurrencies = useCallback(() => currenciesService.getAll(), []);
  const fetchPairs = useCallback(() => pairsService.getMajors(), []);
  const fetchSignals = useCallback(() => signalsService.getActive(), []);
  const fetchSetups = useCallback(() => setupsService.getActive(), []);

  const currencies = useQuery<Currency[]>(fetchCurrencies);
  const pairs = useQuery<CurrencyPair[]>(fetchPairs);
  const signals = useQuery<Signal[]>(fetchSignals);
  const setups = useQuery<TradeSetup[]>(fetchSetups);

  const stats = [
    { label: "Currencies", value: currencies.data?.length ?? "—" },
    { label: "Major Pairs", value: pairs.data?.length ?? "—" },
    { label: "Active Signals", value: signals.data?.length ?? "—" },
    { label: "Active Setups", value: setups.data?.length ?? "—" },
  ];

  const backendOnline = !currencies.error;

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
    </div>
  );
}
