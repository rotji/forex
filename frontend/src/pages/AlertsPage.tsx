import { Fragment, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "../hooks/useQuery";
import { alertsService } from "../services/alerts.service";
import type { AlertStatus, TradeAlert } from "../types";
import styles from "./EventsPage.module.css";

const directionClass: Record<string, string> = {
  BUY: styles.low,
  SELL: styles.high,
  NEUTRAL: styles.medium,
};

export function AlertsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<AlertStatus>("ACTIVE");
  const fetcher = useCallback(() => alertsService.getByStatus(statusFilter), [statusFilter]);
  const { data, loading, error, refetch } = useQuery<TradeAlert[]>(fetcher);
  const [searchText, setSearchText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bulkAcknowledging, setBulkAcknowledging] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupDays, setCleanupDays] = useState("14");
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      return !q || row.pair_symbol.toLowerCase().includes(q) || (row.rationale ?? "").toLowerCase().includes(q);
    });
  }, [data, searchText]);

  async function handleGenerateAlerts() {
    setActionError(null);
    setActionMessage(null);
    setGenerating(true);
    try {
      const result = await alertsService.generate();
      setActionMessage(`Generated ${result.count} active alerts.`);
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to generate alerts.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAcknowledge(id: number) {
    setActionError(null);
    setActionMessage(null);
    setAcknowledgingId(id);
    try {
      await alertsService.acknowledge(id);
      setActionMessage("Alert acknowledged.");
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to acknowledge alert.");
    } finally {
      setAcknowledgingId(null);
    }
  }

  async function handleAcknowledgeVisible() {
    const ids = filtered.filter((row) => row.status === "ACTIVE").map((row) => row.id);
    if (ids.length === 0) {
      setActionMessage("No active visible alerts to acknowledge.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setBulkAcknowledging(true);
    try {
      const result = await alertsService.acknowledgeBulk(ids);
      setActionMessage(`Acknowledged ${result.updated} alerts.`);
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to acknowledge visible alerts.");
    } finally {
      setBulkAcknowledging(false);
    }
  }

  async function handleCleanupExpired() {
    const days = Number(cleanupDays);
    if (!Number.isFinite(days) || days <= 0) {
      setActionError("Cleanup days must be a positive number.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setCleaning(true);
    try {
      const result = await alertsService.cleanupExpired(days);
      setActionMessage(`Deleted ${result.deleted} expired alerts older than ${result.olderThanDays} days.`);
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to cleanup expired alerts.");
    } finally {
      setCleaning(false);
    }
  }

  if (loading) return <p>Loading alerts...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Trade Alerts</h1>
      <p className={styles.sub}>Actionable pair alerts generated from currency bias divergence</p>

      <section className={styles.formCard}>
        <h2 className={styles.formTitle}>Actions</h2>
        <div className={styles.actions}>
          <button className={styles.button} type="button" onClick={() => void handleGenerateAlerts()} disabled={generating}>
            {generating ? "Generating..." : "Generate Alerts"}
          </button>
          <button
            className={styles.buttonSecondary}
            type="button"
            onClick={() => void handleAcknowledgeVisible()}
            disabled={bulkAcknowledging}
          >
            {bulkAcknowledging ? "Saving..." : "Acknowledge Visible"}
          </button>
          <input
            className={styles.input}
            placeholder="Cleanup days"
            value={cleanupDays}
            onChange={(e) => setCleanupDays(e.target.value)}
          />
          <button
            className={styles.buttonSecondary}
            type="button"
            onClick={() => void handleCleanupExpired()}
            disabled={cleaning}
          >
            {cleaning ? "Cleaning..." : "Cleanup Expired"}
          </button>
          <input
            className={styles.input}
            placeholder="Search pair or rationale"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AlertStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="EXPIRED">Expired</option>
            <option value="ALL">All</option>
          </select>
        </div>
        {actionMessage && <p className={styles.success}>{actionMessage}</p>}
        {actionError && <p className={styles.error}>{actionError}</p>}
      </section>

      {filtered.length === 0 ? (
        <p>No active alerts found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Direction</th>
              <th>Confidence</th>
              <th>Why</th>
              <th>Triggered</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Fragment key={row.id}>
                <tr>
                  <td><button style={{background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontWeight: "700", textDecoration: "underline"}} onClick={() => navigate(`/alerts/${row.id}`)}><strong>{row.pair_symbol}</strong></button></td>
                  <td>
                    <span className={`${styles.impact} ${directionClass[row.direction] ?? ""}`}>
                      {row.direction}
                    </span>
                  </td>
                  <td>{(row.confidence * 100).toFixed(0)}%</td>
                  <td>
                    <button
                      className={styles.buttonSecondary}
                      type="button"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      {expandedId === row.id ? "Hide" : "View"}
                    </button>
                  </td>
                  <td>{new Date(row.triggered_at).toLocaleString()}</td>
                  <td>{row.expires_at ? new Date(row.expires_at).toLocaleString() : "-"}</td>
                  <td>
                    {row.status === "ACTIVE" ? (
                      <button
                        className={styles.editBtn}
                        type="button"
                        disabled={acknowledgingId === row.id}
                        onClick={() => void handleAcknowledge(row.id)}
                      >
                        {acknowledgingId === row.id ? "Saving..." : "Acknowledge"}
                      </button>
                    ) : (
                      <span className={styles.meta}>{row.status}</span>
                    )}
                  </td>
                </tr>
                {expandedId === row.id && (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.meta}>
                        <strong>{row.base_currency ?? "Base"}</strong> bias score: {row.base_score?.toFixed(2) ?? "-"}; <strong>{row.quote_currency ?? "Quote"}</strong> bias score: {row.quote_score?.toFixed(2) ?? "-"}; divergence: {row.score_diff?.toFixed(2) ?? "-"}.
                        {row.rationale ? ` ${row.rationale}` : ""}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
