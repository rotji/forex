import { useCallback } from "react";
import { useQuery } from "../hooks/useQuery";
import { eventsService } from "../services/events.service";
import type { EconomicEvent } from "../types";
import styles from "./EventsPage.module.css";

const impactClass: Record<string, string> = {
  LOW: styles.low,
  MEDIUM: styles.medium,
  HIGH: styles.high,
};

export function EventsPage() {
  const fetcher = useCallback(() => eventsService.getUpcoming(), []);
  const { data, loading, error } = useQuery<EconomicEvent[]>(fetcher);

  if (loading) return <p>Loading events…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Economic Events</h1>
      <p className={styles.sub}>Upcoming scheduled events</p>
      {data?.length === 0 ? (
        <p>No upcoming events found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Currency</th>
              <th>Impact</th>
              <th>Scheduled</th>
              <th>Forecast</th>
              <th>Previous</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((e) => (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>{e.currency}</td>
                <td>
                  <span className={`${styles.impact} ${impactClass[e.impact] ?? ""}`}>
                    {e.impact}
                  </span>
                </td>
                <td>{new Date(e.scheduled_at).toLocaleString()}</td>
                <td>{e.forecast_value ?? "—"}</td>
                <td>{e.previous_value ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
