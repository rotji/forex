import { useCallback, useMemo, useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { macroIndicatorsService } from "../services/macro-indicators.service";
import type { MacroIndicator } from "../types";
import styles from "./EventsPage.module.css";

const importanceClass: Record<string, string> = {
  LOW: styles.low,
  MEDIUM: styles.medium,
  HIGH: styles.high,
};

export function MacroIndicatorsPage() {
  const fetcher = useCallback(() => macroIndicatorsService.getLatest(), []);
  const { data, loading, error } = useQuery<MacroIndicator[]>(fetcher);
  const [searchText, setSearchText] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [importanceFilter, setImportanceFilter] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");

  const currencyOptions = useMemo(() => {
    const values = Array.from(new Set((data ?? []).map((row) => row.currency))).sort();
    return ["ALL", ...values];
  }, [data]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      const matchesQ =
        !q ||
        row.indicator_name.toLowerCase().includes(q) ||
        row.indicator_code.toLowerCase().includes(q) ||
        row.currency.toLowerCase().includes(q);
      const matchesCurrency = currencyFilter === "ALL" || row.currency === currencyFilter;
      const matchesImportance = importanceFilter === "ALL" || row.importance === importanceFilter;
      return matchesQ && matchesCurrency && matchesImportance;
    });
  }, [data, searchText, currencyFilter, importanceFilter]);

  if (loading) return <p>Loading macro indicators...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Macro Indicators</h1>
      <p className={styles.sub}>Latest released macro data points driving currency moves</p>

      <section className={styles.filterCard}>
        <h2 className={styles.filterTitle}>Search and Filter</h2>
        <div className={styles.filterGrid}>
          <input
            className={styles.input}
            placeholder="Search indicator, code, currency"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select className={styles.select} value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            {currencyOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "ALL" ? "All currencies" : opt}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={importanceFilter}
            onChange={(e) => setImportanceFilter(e.target.value as "ALL" | "LOW" | "MEDIUM" | "HIGH")}
          >
            <option value="ALL">All importance</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
        <p className={styles.meta}>Showing {filtered.length} of {data?.length ?? 0} indicators</p>
      </section>

      {filtered.length === 0 ? (
        <p>No indicators found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Currency</th>
              <th>Value</th>
              <th>Forecast</th>
              <th>Previous</th>
              <th>Importance</th>
              <th>Released</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.indicator_name}</strong>
                  <div className={styles.meta}>{row.indicator_code}</div>
                </td>
                <td>{row.currency}</td>
                <td>{row.value ?? "-"}{row.unit ? ` ${row.unit}` : ""}</td>
                <td>{row.forecast_value ?? "-"}</td>
                <td>{row.previous_value ?? "-"}</td>
                <td>
                  <span className={`${styles.impact} ${importanceClass[row.importance] ?? ""}`}>
                    {row.importance}
                  </span>
                </td>
                <td>{new Date(row.released_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
