import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "../hooks/useQuery";
import { positioningService } from "../services/positioning.service";
import type { BiasLabel, PositioningConviction, PositioningSnapshot } from "../types";
import styles from "./EventsPage.module.css";

const biasClass: Record<BiasLabel, string> = {
  BULLISH: styles.low,
  NEUTRAL: styles.medium,
  BEARISH: styles.high,
};

const convictionClass: Record<PositioningConviction, string> = {
  LOW: styles.low,
  MEDIUM: styles.medium,
  HIGH: styles.high,
};

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "SGD", "HKD", "SEK", "NOK", "DKK", "ZAR", "MXN", "BRL"];
const BIASES: BiasLabel[] = ["BULLISH", "NEUTRAL", "BEARISH"];
const CONVICTIONS: PositioningConviction[] = ["LOW", "MEDIUM", "HIGH"];

export function PositioningPage() {
  const fetcher = useCallback(() => positioningService.getLatest(), []);
  const { data, loading, error, refetch } = useQuery<PositioningSnapshot[]>(fetcher);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [currency, setCurrency] = useState("USD");
  const [bias, setBias] = useState<BiasLabel>("NEUTRAL");
  const [conviction, setConviction] = useState<PositioningConviction>("MEDIUM");
  const [netPositionRatio, setNetPositionRatio] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [source, setSource] = useState("Manual UI");
  const [notes, setNotes] = useState("");

  const [searchText, setSearchText] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [biasFilter, setBiasFilter] = useState<"ALL" | BiasLabel>("ALL");

  function resetForm() {
    setCurrency("USD");
    setBias("NEUTRAL");
    setConviction("MEDIUM");
    setNetPositionRatio("");
    setRecordedAt("");
    setSource("Manual UI");
    setNotes("");
    setEditingId(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function startEditing(row: PositioningSnapshot) {
    setEditingId(row.id);
    setCurrency(row.currency);
    setBias(row.bias);
    setConviction(row.conviction);
    setNetPositionRatio(row.net_position_ratio != null ? String(row.net_position_ratio) : "");
    const dt = new Date(row.recorded_at);
    setRecordedAt(new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setSource(row.source ?? "");
    setNotes(row.notes ?? "");
    setSubmitError(null);
    setSubmitSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this positioning snapshot? This cannot be undone.")) return;
    try {
      await positioningService.remove(id);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete snapshot.");
    }
  }

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      const matchesQuery =
        !q ||
        row.currency.toLowerCase().includes(q) ||
        row.source?.toLowerCase().includes(q) ||
        row.notes?.toLowerCase().includes(q);
      const matchesCurrency = currencyFilter === "ALL" || row.currency === currencyFilter;
      const matchesBias = biasFilter === "ALL" || row.bias === biasFilter;
      return matchesQuery && matchesCurrency && matchesBias;
    });
  }, [data, searchText, currencyFilter, biasFilter]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!recordedAt) {
      setSubmitError("Recorded date/time is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        currency,
        bias,
        conviction,
        net_position_ratio: netPositionRatio.trim() === "" ? null : Number(netPositionRatio),
        recorded_at: new Date(recordedAt).toISOString(),
        source: source.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingId !== null) {
        await positioningService.update(editingId, payload);
        setSubmitSuccess("Positioning snapshot updated.");
        setEditingId(null);
      } else {
        await positioningService.create(payload);
        setSubmitSuccess("Positioning snapshot created.");
        setNetPositionRatio("");
        setRecordedAt("");
        setNotes("");
      }

      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save positioning snapshot.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading positioning...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Positioning</h1>
      <p className={styles.sub}>Manual currency sentiment and positioning snapshots for the bias engine</p>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>{editingId !== null ? "Edit Positioning Snapshot" : "Add Positioning Snapshot"}</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Currency</label>
            <select className={styles.select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Bias</label>
            <select className={styles.select} value={bias} onChange={(e) => setBias(e.target.value as BiasLabel)}>
              {BIASES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Conviction</label>
            <select className={styles.select} value={conviction} onChange={(e) => setConviction(e.target.value as PositioningConviction)}>
              {CONVICTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Net Position Ratio</label>
            <input className={styles.input} placeholder="e.g. 1.2" type="number" step="any" value={netPositionRatio} onChange={(e) => setNetPositionRatio(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Recorded</label>
            <input className={styles.input} type="datetime-local" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Source</label>
            <input className={styles.input} placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Notes</label>
          <textarea className={styles.textarea} placeholder="Describe the positioning view" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId !== null ? "Update Snapshot" : "Add Snapshot"}
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
          <input className={styles.input} placeholder="Search currency, notes, source" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <select className={styles.select} value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            <option value="ALL">All currencies</option>
            {CURRENCIES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className={styles.select} value={biasFilter} onChange={(e) => setBiasFilter(e.target.value as "ALL" | BiasLabel)}>
            <option value="ALL">All bias views</option>
            {BIASES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <p className={styles.meta}>Showing {filtered.length} of {data?.length ?? 0} positioning snapshots</p>
      </section>

      {filtered.length === 0 ? (
        <p>No positioning snapshots found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Currency</th>
              <th>Bias</th>
              <th>Conviction</th>
              <th>Net Ratio</th>
              <th>Recorded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className={editingId === row.id ? styles.editingRow : undefined}>
                <td>{row.currency}</td>
                <td><span className={`${styles.impact} ${biasClass[row.bias]}`}>{row.bias}</span></td>
                <td><span className={`${styles.impact} ${convictionClass[row.conviction]}`}>{row.conviction}</span></td>
                <td>{row.net_position_ratio ?? "-"}</td>
                <td>{new Date(row.recorded_at).toLocaleString()}</td>
                <td className={styles.rowActions}>
                  <button className={styles.editBtn} type="button" onClick={() => startEditing(row)}>Edit</button>
                  <button className={styles.deleteBtn} type="button" onClick={() => void handleDelete(row.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}