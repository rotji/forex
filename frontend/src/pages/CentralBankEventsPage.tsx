import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "../hooks/useQuery";
import { centralBankEventsService } from "../services/central-bank-events.service";
import type { CentralBankEvent } from "../types";
import styles from "./EventsPage.module.css";

const toneClass: Record<string, string> = {
  DOVISH: styles.high,
  NEUTRAL: styles.medium,
  HAWKISH: styles.low,
};

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];
const EVENT_TYPES = ["RATE_DECISION", "SPEECH", "MINUTES", "PRESS_CONFERENCE", "INTERVENTION"] as const;

export function CentralBankEventsPage() {
  const fetcher = useCallback(() => centralBankEventsService.getUpcoming(), []);
  const { data, loading, error, refetch } = useQuery<CentralBankEvent[]>(fetcher);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // form fields
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<typeof EVENT_TYPES[number]>("RATE_DECISION");
  const [currency, setCurrency] = useState("USD");
  const [scheduledAt, setScheduledAt] = useState("");
  const [expectedValue, setExpectedValue] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [outcomeTone, setOutcomeTone] = useState<"DOVISH" | "NEUTRAL" | "HAWKISH" | "">("");
  const [source, setSource] = useState("Manual UI");

  // filters
  const [searchText, setSearchText] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");

  function resetForm() {
    setBankCode(""); setBankName(""); setTitle(""); setEventType("RATE_DECISION");
    setCurrency("USD"); setScheduledAt(""); setExpectedValue(""); setActualValue("");
    setOutcomeTone(""); setSource("Manual UI");
    setEditingId(null); setSubmitError(null); setSubmitSuccess(null);
  }

  function startEditing(row: CentralBankEvent) {
    setEditingId(row.id);
    setBankCode(row.bank_code);
    setBankName(row.bank_name);
    setTitle(row.title);
    setEventType(row.event_type);
    setCurrency(row.currency);
    const dt = new Date(row.scheduled_at);
    setScheduledAt(new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setExpectedValue(row.expected_value ?? "");
    setActualValue(row.actual_value ?? "");
    setOutcomeTone(row.outcome_tone ?? "");
    setSource(row.source ?? "");
    setSubmitError(null); setSubmitSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this central bank event? This cannot be undone.")) return;
    try {
      await centralBankEventsService.remove(id);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  const currencyOptions = useMemo(() => {
    const values = Array.from(new Set((data ?? []).map((r) => r.currency))).sort();
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitError(null); setSubmitSuccess(null);
    if (!bankCode.trim()) { setSubmitError("Bank code is required."); return; }
    if (!bankName.trim()) { setSubmitError("Bank name is required."); return; }
    if (!title.trim()) { setSubmitError("Title is required."); return; }
    if (!scheduledAt) { setSubmitError("Scheduled date/time is required."); return; }

    setSubmitting(true);
    try {
      const payload = {
        bank_code: bankCode.trim().toUpperCase(),
        bank_name: bankName.trim(),
        title: title.trim(),
        event_type: eventType,
        currency: currency.toUpperCase(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        expected_value: expectedValue.trim() || null,
        actual_value: actualValue.trim() || null,
        outcome_tone: (outcomeTone || null) as "DOVISH" | "NEUTRAL" | "HAWKISH" | null,
        source: source.trim() || null,
      };

      if (editingId !== null) {
        await centralBankEventsService.update(editingId, payload);
        setSubmitSuccess("Event updated.");
        setEditingId(null);
      } else {
        await centralBankEventsService.create(payload);
        setBankCode(""); setBankName(""); setTitle(""); setScheduledAt("");
        setExpectedValue(""); setActualValue(""); setOutcomeTone("");
        setSubmitSuccess("Event created.");
      }
      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading central bank events...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Central Bank Events</h1>
      <p className={styles.sub}>Upcoming policy and communication events by central banks</p>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>{editingId !== null ? "Edit Central Bank Event" : "Add Central Bank Event"}</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Event</label>
            <input className={styles.input} placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Bank</label>
            <div className={styles.fieldStack}>
              <input className={styles.input} placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              <input className={styles.input} placeholder="Bank code" value={bankCode} onChange={(e) => setBankCode(e.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Currency</label>
            <select className={styles.select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Type</label>
            <select className={styles.select} value={eventType} onChange={(e) => setEventType(e.target.value as typeof EVENT_TYPES[number])}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Expected</label>
            <input className={styles.input} placeholder="Expected" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tone</label>
            <select className={styles.select} value={outcomeTone} onChange={(e) => setOutcomeTone(e.target.value as "DOVISH" | "NEUTRAL" | "HAWKISH" | "") }>
              <option value="">No tone</option>
              <option value="DOVISH">DOVISH</option>
              <option value="NEUTRAL">NEUTRAL</option>
              <option value="HAWKISH">HAWKISH</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Scheduled</label>
            <input className={styles.input} type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        </div>

        <p className={styles.sectionLabel}>Additional Fields</p>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Actual</label>
            <input className={styles.input} placeholder="Actual" value={actualValue} onChange={(e) => setActualValue(e.target.value)} />
            <span className={styles.fieldHint}>Stored, but not shown in the main table.</span>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Source</label>
            <input className={styles.input} placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId !== null ? "Update Event" : "Add Event"}
          </button>
          {editingId !== null && (
            <button className={styles.buttonSecondary} type="button" onClick={resetForm}>Cancel</button>
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
            placeholder="Search title, bank, currency"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select className={styles.select} value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            {currencyOptions.map((opt) => (
              <option key={opt} value={opt}>{opt === "ALL" ? "All currencies" : opt}</option>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className={editingId === row.id ? styles.editingRow : undefined}>
                <td>{row.title}</td>
                <td>
                  <strong>{row.bank_name}</strong>
                  <div className={styles.meta}>{row.bank_code}</div>
                </td>
                <td>{row.currency}</td>
                <td>{row.event_type}</td>
                <td>{row.expected_value ?? "-"}</td>
                <td>
                  {row.outcome_tone ? (
                    <span className={`${styles.impact} ${toneClass[row.outcome_tone] ?? ""}`}>
                      {row.outcome_tone}
                    </span>
                  ) : "-"}
                </td>
                <td>{new Date(row.scheduled_at).toLocaleString()}</td>
                <td>
                  <div className={styles.rowActions}>
                    <button className={styles.editBtn} type="button" onClick={() => startEditing(row)}>Edit</button>
                    <button className={styles.deleteBtn} type="button" onClick={() => handleDelete(row.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
