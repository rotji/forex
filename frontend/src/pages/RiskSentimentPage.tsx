import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "../hooks/useQuery";
import { riskSentimentService } from "../services/risk-sentiment.service";
import type { BiasLabel, RiskRegime, RiskSentimentSnapshot } from "../types";
import styles from "./EventsPage.module.css";

const toneClass: Record<BiasLabel, string> = {
  BULLISH: styles.low,
  NEUTRAL: styles.medium,
  BEARISH: styles.high,
};

const regimeClass: Record<RiskRegime, string> = {
  RISK_ON: styles.low,
  NEUTRAL: styles.medium,
  RISK_OFF: styles.high,
};

const REGIMES: RiskRegime[] = ["RISK_ON", "NEUTRAL", "RISK_OFF"];
const BIASES: BiasLabel[] = ["BULLISH", "NEUTRAL", "BEARISH"];

export function RiskSentimentPage() {
  const fetcher = useCallback(() => riskSentimentService.getLatest(), []);
  const { data, loading, error, refetch } = useQuery<RiskSentimentSnapshot[]>(fetcher);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [regime, setRegime] = useState<RiskRegime>("NEUTRAL");
  const [vixLevel, setVixLevel] = useState("");
  const [dxyBias, setDxyBias] = useState<BiasLabel>("NEUTRAL");
  const [yieldsBias, setYieldsBias] = useState<BiasLabel>("NEUTRAL");
  const [equitiesTone, setEquitiesTone] = useState<BiasLabel>("NEUTRAL");
  const [commoditiesTone, setCommoditiesTone] = useState<BiasLabel>("NEUTRAL");
  const [recordedAt, setRecordedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("Manual UI");

  const [searchText, setSearchText] = useState("");
  const [regimeFilter, setRegimeFilter] = useState<"ALL" | RiskRegime>("ALL");

  function resetForm() {
    setRegime("NEUTRAL");
    setVixLevel("");
    setDxyBias("NEUTRAL");
    setYieldsBias("NEUTRAL");
    setEquitiesTone("NEUTRAL");
    setCommoditiesTone("NEUTRAL");
    setRecordedAt("");
    setNotes("");
    setSource("Manual UI");
    setEditingId(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function startEditing(row: RiskSentimentSnapshot) {
    setEditingId(row.id);
    setRegime(row.regime);
    setVixLevel(row.vix_level != null ? String(row.vix_level) : "");
    setDxyBias(row.dxy_bias);
    setYieldsBias(row.yields_bias);
    setEquitiesTone(row.equities_tone);
    setCommoditiesTone(row.commodities_tone);
    const dt = new Date(row.recorded_at);
    setRecordedAt(new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setNotes(row.notes ?? "");
    setSource(row.source ?? "");
    setSubmitError(null);
    setSubmitSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this risk sentiment snapshot? This cannot be undone.")) return;
    try {
      await riskSentimentService.remove(id);
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
        row.regime.toLowerCase().includes(q) ||
        row.notes?.toLowerCase().includes(q) ||
        row.source?.toLowerCase().includes(q);
      const matchesRegime = regimeFilter === "ALL" || row.regime === regimeFilter;
      return matchesQuery && matchesRegime;
    });
  }, [data, searchText, regimeFilter]);

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
        regime,
        vix_level: vixLevel.trim() === "" ? null : Number(vixLevel),
        dxy_bias: dxyBias,
        yields_bias: yieldsBias,
        equities_tone: equitiesTone,
        commodities_tone: commoditiesTone,
        recorded_at: new Date(recordedAt).toISOString(),
        notes: notes.trim() || null,
        source: source.trim() || null,
      };

      if (editingId !== null) {
        await riskSentimentService.update(editingId, payload);
        setSubmitSuccess("Risk sentiment snapshot updated.");
        setEditingId(null);
      } else {
        await riskSentimentService.create(payload);
        setSubmitSuccess("Risk sentiment snapshot created.");
        setVixLevel("");
        setRecordedAt("");
        setNotes("");
      }

      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save risk sentiment snapshot.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading risk sentiment...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Risk Sentiment</h1>
      <p className={styles.sub}>Manual market regime inputs for risk-on, risk-off, and USD liquidity tone</p>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>{editingId !== null ? "Edit Risk Sentiment Snapshot" : "Add Risk Sentiment Snapshot"}</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Regime</label>
            <select className={styles.select} value={regime} onChange={(e) => setRegime(e.target.value as RiskRegime)}>
              {REGIMES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>VIX Level</label>
            <input className={styles.input} placeholder="e.g. 19.4" type="number" step="any" value={vixLevel} onChange={(e) => setVixLevel(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>DXY Bias</label>
            <select className={styles.select} value={dxyBias} onChange={(e) => setDxyBias(e.target.value as BiasLabel)}>
              {BIASES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>US Yields Bias</label>
            <select className={styles.select} value={yieldsBias} onChange={(e) => setYieldsBias(e.target.value as BiasLabel)}>
              {BIASES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Equities Tone</label>
            <select className={styles.select} value={equitiesTone} onChange={(e) => setEquitiesTone(e.target.value as BiasLabel)}>
              {BIASES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Commodities Tone</label>
            <select className={styles.select} value={commoditiesTone} onChange={(e) => setCommoditiesTone(e.target.value as BiasLabel)}>
              {BIASES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
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
          <textarea className={styles.textarea} placeholder="Describe the current market regime" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
          <input className={styles.input} placeholder="Search notes or source" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <select className={styles.select} value={regimeFilter} onChange={(e) => setRegimeFilter(e.target.value as "ALL" | RiskRegime)}>
            <option value="ALL">All regimes</option>
            {REGIMES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <p className={styles.meta}>Showing {filtered.length} of {data?.length ?? 0} sentiment snapshots</p>
      </section>

      {filtered.length === 0 ? (
        <p>No risk sentiment snapshots found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Regime</th>
              <th>VIX</th>
              <th>DXY</th>
              <th>Yields</th>
              <th>Equities</th>
              <th>Commodities</th>
              <th>Recorded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className={editingId === row.id ? styles.editingRow : undefined}>
                <td><span className={`${styles.impact} ${regimeClass[row.regime]}`}>{row.regime}</span></td>
                <td>{row.vix_level ?? "-"}</td>
                <td><span className={`${styles.impact} ${toneClass[row.dxy_bias]}`}>{row.dxy_bias}</span></td>
                <td><span className={`${styles.impact} ${toneClass[row.yields_bias]}`}>{row.yields_bias}</span></td>
                <td><span className={`${styles.impact} ${toneClass[row.equities_tone]}`}>{row.equities_tone}</span></td>
                <td><span className={`${styles.impact} ${toneClass[row.commodities_tone]}`}>{row.commodities_tone}</span></td>
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