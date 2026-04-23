import { useCallback, useMemo, useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { centralBankEventsService } from "../services/central-bank-events.service";
import type { CentralBankEvent } from "../types";
import styles from "./EventsPage.module.css";

const toneClass: Record<string, string> = {
  DOVISH: styles.high,
  NEUTRAL: styles.medium,
  HAWKISH: styles.low,
};

export function CentralBankEventsPage() {
  const fetcher = useCallback(() => centralBankEventsService.getUpcoming(), []);
  const { data, loading, error } = useQuery<CentralBankEvent[]>(fetcher);
  const [searchText, setSearchText] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");

  const currencyOptions = useMemo(() => {
    const values = Array.from(new Set((data ?? []).map((row) => row.currency))).sort();
    return ["ALL", ...values];
  }, [data]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      const matchesQ =
        !q ||
        row.title.toLowerCase().includes(q) ||
        row.bank_name.toLowerCase().includes(q) ||
        row.currency.toLowerCase().includes(q);
      const matchesCurrency = currencyFilter === "ALL" || row.currency === currencyFilter;
      return matchesQ && matchesCurrency;
    });
  }, [data, searchText, currencyFilter]);

  if (loading) return <p>Loading central bank events...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Central Bank Events</h1>
      <p className={styles.sub}>Upcoming policy and communication events by central banks</p>

      <section className={styles.filterCard}>
        <h2 className={styles.filterTitle}>Search and Filter</h2>
        <div className={styles.filterGrid}>
          <input
            className={styles.input}
            placeholder="Search title, bank, currency"
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
        </div>
        <p className={styles.meta}>Showing {filtered.length} of {data?.length ?? 0} events</p>
      </section>

      {filtered.length === 0 ? (
        <p>No central bank events found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Event</th>
              <th>Bank</th>
              <th>Currency</th>
              <th>Type</th>
              <th>Expected</th>
              <th>Tone</th>
              <th>Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>{row.bank_name}</td>
                <td>{row.currency}</td>
                <td>{row.event_type}</td>
                <td>{row.expected_value ?? "-"}</td>
                <td>
                  {row.outcome_tone ? (
                    <span className={`${styles.impact} ${toneClass[row.outcome_tone] ?? ""}`}>
                      {row.outcome_tone}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{new Date(row.scheduled_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
