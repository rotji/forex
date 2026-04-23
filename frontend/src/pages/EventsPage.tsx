import { useCallback, useMemo, useState, type FormEvent } from "react";
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
  const { data, loading, error, refetch } = useQuery<EconomicEvent[]>(fetcher);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [impact, setImpact] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [scheduledAt, setScheduledAt] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [forecastValue, setForecastValue] = useState("");
  const [previousValue, setPreviousValue] = useState("");
  const [source, setSource] = useState("Manual UI");
  const [searchText, setSearchText] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [impactFilter, setImpactFilter] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");

  function resetForm() {
    setTitle("");
    setCurrency("USD");
    setImpact("MEDIUM");
    setScheduledAt("");
    setActualValue("");
    setForecastValue("");
    setPreviousValue("");
    setSource("Manual UI");
    setEditingId(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function startEditing(event: EconomicEvent) {
    setEditingId(event.id);
    setTitle(event.title);
    setCurrency(event.currency);
    setImpact(event.impact);
    const dt = new Date(event.scheduled_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduledAt(local);
    setActualValue(event.actual_value ?? "");
    setForecastValue(event.forecast_value ?? "");
    setPreviousValue(event.previous_value ?? "");
    setSource(event.source ?? "");
    setSubmitError(null);
    setSubmitSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    try {
      await eventsService.remove(id);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete event.");
    }
  }

  const currencyOptions = useMemo(() => {
    const values = Array.from(new Set((data ?? []).map((e) => e.currency))).sort();
    return ["ALL", ...values];
  }, [data]);

  const filteredEvents = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return (data ?? []).filter((event) => {
      const matchesQuery =
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.currency.toLowerCase().includes(query) ||
        (event.source ?? "").toLowerCase().includes(query);
      const matchesCurrency = currencyFilter === "ALL" || event.currency === currencyFilter;
      const matchesImpact = impactFilter === "ALL" || event.impact === impactFilter;
      return matchesQuery && matchesCurrency && matchesImpact;
    });
  }, [data, searchText, currencyFilter, impactFilter]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!title.trim()) {
      setSubmitError("Title is required.");
      return;
    }
    if (!scheduledAt) {
      setSubmitError("Scheduled date/time is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId !== null) {
        await eventsService.update(editingId, {
          title: title.trim(),
          currency: currency.toUpperCase(),
          impact,
          scheduledAt: new Date(scheduledAt).toISOString(),
          actualValue: actualValue.trim() || null,
          forecastValue: forecastValue.trim() || null,
          previousValue: previousValue.trim() || null,
          source: source.trim() || null,
        });
        setSubmitSuccess("Event updated successfully.");
        setEditingId(null);
      } else {
        await eventsService.create({
          title: title.trim(),
          currency: currency.toUpperCase(),
          impact,
          scheduledAt: new Date(scheduledAt).toISOString(),
          actualValue: actualValue.trim() || undefined,
          forecastValue: forecastValue.trim() || undefined,
          previousValue: previousValue.trim() || undefined,
          source: source.trim() || undefined,
        });
        setTitle("");
        setScheduledAt("");
        setActualValue("");
        setForecastValue("");
        setPreviousValue("");
        setSubmitSuccess("Event created successfully.");
      }
      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading events...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Economic Events</h1>
      <p className={styles.sub}>Upcoming scheduled events</p>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>{editingId !== null ? "Edit Economic Event" : "Add Economic Event"}</h2>
        <div className={styles.formGrid}>
          <input className={styles.input} placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input
            className={styles.input}
            placeholder="Currency (e.g. USD)"
            value={currency}
            maxLength={3}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
          <select className={styles.select} value={impact} onChange={(e) => setImpact(e.target.value as "LOW" | "MEDIUM" | "HIGH")}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
          <input className={styles.input} type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          <input className={styles.input} placeholder="Actual value" value={actualValue} onChange={(e) => setActualValue(e.target.value)} />
          <input className={styles.input} placeholder="Forecast value" value={forecastValue} onChange={(e) => setForecastValue(e.target.value)} />
          <input className={styles.input} placeholder="Previous value" value={previousValue} onChange={(e) => setPreviousValue(e.target.value)} />
          <input className={styles.input} placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId !== null ? "Update Event" : "Create Event"}
          </button>
          {editingId !== null && (
            <button className={styles.buttonSecondary} type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
          {submitError && <p className={styles.error}>{submitError}</p>}
          {submitSuccess && <p className={styles.success}>{submitSuccess}</p>}
        </div>
      </form>

      <section className={styles.filterCard}>
        <h2 className={styles.filterTitle}>Search and Filter</h2>
        <div className={styles.filterGrid}>
          <input
            className={styles.input}
            placeholder="Search title, currency, source"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select className={styles.select} value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            {currencyOptions.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "All currencies" : option}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={impactFilter}
            onChange={(e) => setImpactFilter(e.target.value as "ALL" | "LOW" | "MEDIUM" | "HIGH")}
          >
            <option value="ALL">All impacts</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
        <p className={styles.meta}>Showing {filteredEvents.length} of {data?.length ?? 0} events</p>
      </section>

      {filteredEvents.length === 0 ? (
        <p>No upcoming events found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Currency</th>
              <th>Impact</th>
              <th>Scheduled</th>
              <th>Actual</th>
              <th>Forecast</th>
              <th>Previous</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((e) => (
              <tr key={e.id} className={editingId === e.id ? styles.editingRow : undefined}>
                <td>{e.title}</td>
                <td>{e.currency}</td>
                <td>
                  <span className={`${styles.impact} ${impactClass[e.impact] ?? ""}`}>
                    {e.impact}
                  </span>
                </td>
                <td>{new Date(e.scheduled_at).toLocaleString()}</td>
                <td>{e.actual_value ?? "-"}</td>
                <td>{e.forecast_value ?? "-"}</td>
                <td>{e.previous_value ?? "-"}</td>
                <td className={styles.rowActions}>
                  <button className={styles.editBtn} type="button" onClick={() => startEditing(e)}>Edit</button>
                  <button className={styles.deleteBtn} type="button" onClick={() => void handleDelete(e.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
