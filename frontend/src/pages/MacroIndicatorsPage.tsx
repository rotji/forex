import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "../hooks/useQuery";
import { macroIndicatorsService } from "../services/macro-indicators.service";
import type { MacroIndicator } from "../types";
import styles from "./EventsPage.module.css";

const importanceClass: Record<string, string> = {
  LOW: styles.low,
  MEDIUM: styles.medium,
  HIGH: styles.high,
};

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

export function MacroIndicatorsPage() {
  const fetcher = useCallback(() => macroIndicatorsService.getLatest(), []);
  const { data, loading, error, refetch } = useQuery<MacroIndicator[]>(fetcher);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // form fields
  const [indicatorCode, setIndicatorCode] = useState("");
  const [indicatorName, setIndicatorName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [value, setValue] = useState("");
  const [previousValue, setPreviousValue] = useState("");
  const [forecastValue, setForecastValue] = useState("");
  const [unit, setUnit] = useState("");
  const [importance, setImportance] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [signalDirection, setSignalDirection] = useState<"HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH">("HIGHER_IS_BULLISH");
  const [period, setPeriod] = useState("");
  const [releasedAt, setReleasedAt] = useState("");
  const [source, setSource] = useState("Manual UI");

  // filters
  const [searchText, setSearchText] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [importanceFilter, setImportanceFilter] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");

  function resetForm() {
    setIndicatorCode(""); setIndicatorName(""); setCurrency("USD");
    setValue(""); setPreviousValue(""); setForecastValue("");
    setUnit(""); setImportance("MEDIUM"); setSignalDirection("HIGHER_IS_BULLISH");
    setPeriod(""); setReleasedAt(""); setSource("Manual UI");
    setEditingId(null); setSubmitError(null); setSubmitSuccess(null);
  }

  function startEditing(row: MacroIndicator) {
    setEditingId(row.id);
    setIndicatorCode(row.indicator_code);
    setIndicatorName(row.indicator_name);
    setCurrency(row.currency);
    setValue(row.value != null ? String(row.value) : "");
    setPreviousValue(row.previous_value != null ? String(row.previous_value) : "");
    setForecastValue(row.forecast_value != null ? String(row.forecast_value) : "");
    setUnit(row.unit ?? "");
    setImportance(row.importance);
    setSignalDirection(row.signal_direction);
    setPeriod(row.period ?? "");
    const dt = new Date(row.released_at);
    setReleasedAt(new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setSource(row.source ?? "");
    setSubmitError(null); setSubmitSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this macro indicator? This cannot be undone.")) return;
    try {
      await macroIndicatorsService.remove(id);
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
        row.indicator_name.toLowerCase().includes(q) ||
        row.indicator_code.toLowerCase().includes(q) ||
        row.currency.toLowerCase().includes(q);
      const matchesCurrency = currencyFilter === "ALL" || row.currency === currencyFilter;
      const matchesImportance = importanceFilter === "ALL" || row.importance === importanceFilter;
      return matchesQ && matchesCurrency && matchesImportance;
    });
  }, [data, searchText, currencyFilter, importanceFilter]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitError(null); setSubmitSuccess(null);
    if (!indicatorCode.trim()) { setSubmitError("Indicator code is required."); return; }
    if (!indicatorName.trim()) { setSubmitError("Indicator name is required."); return; }
    if (!releasedAt) { setSubmitError("Released date/time is required."); return; }

    const toNum = (v: string) => v.trim() === "" ? null : Number(v);

    setSubmitting(true);
    try {
      const payload = {
        indicator_code: indicatorCode.trim().toUpperCase(),
        indicator_name: indicatorName.trim(),
        currency: currency.toUpperCase(),
        value: toNum(value),
        previous_value: toNum(previousValue),
        forecast_value: toNum(forecastValue),
        unit: unit.trim() || null,
        importance,
        signal_direction: signalDirection,
        period: period.trim() || null,
        released_at: new Date(releasedAt).toISOString(),
        source: source.trim() || null,
      };

      if (editingId !== null) {
        await macroIndicatorsService.update(editingId, payload);
        setSubmitSuccess("Macro indicator updated.");
        setEditingId(null);
      } else {
        await macroIndicatorsService.create(payload);
        setIndicatorCode(""); setIndicatorName(""); setValue("");
        setPreviousValue(""); setForecastValue(""); setPeriod(""); setReleasedAt("");
        setSubmitSuccess("Macro indicator created.");
      }
      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading macro indicators...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Macro Indicators</h1>
      <p className={styles.sub}>Latest released macro data points driving currency moves</p>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>{editingId !== null ? "Edit Macro Indicator" : "Add Macro Indicator"}</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Indicator</label>
            <div className={styles.fieldStack}>
              <input className={styles.input} placeholder="Indicator name" value={indicatorName} onChange={(e) => setIndicatorName(e.target.value)} />
              <input className={styles.input} placeholder="Indicator code" value={indicatorCode} onChange={(e) => setIndicatorCode(e.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Currency</label>
            <select className={styles.select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Value</label>
            <input className={styles.input} placeholder="Value" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Forecast</label>
            <input className={styles.input} placeholder="Forecast" type="number" step="any" value={forecastValue} onChange={(e) => setForecastValue(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Previous</label>
            <input className={styles.input} placeholder="Previous" type="number" step="any" value={previousValue} onChange={(e) => setPreviousValue(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Importance</label>
            <select className={styles.select} value={importance} onChange={(e) => setImportance(e.target.value as "LOW" | "MEDIUM" | "HIGH")}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Released</label>
            <input className={styles.input} type="datetime-local" value={releasedAt} onChange={(e) => setReleasedAt(e.target.value)} />
          </div>
        </div>

        <p className={styles.sectionLabel}>Additional Fields</p>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Unit</label>
            <input className={styles.input} placeholder="e.g. %, bps" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <span className={styles.fieldHint}>Shown next to the Value column.</span>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Signal Direction</label>
            <select className={styles.select} value={signalDirection} onChange={(e) => setSignalDirection(e.target.value as "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH")}>
              <option value="HIGHER_IS_BULLISH">Higher is Bullish</option>
              <option value="LOWER_IS_BULLISH">Lower is Bullish</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Period</label>
            <input className={styles.input} placeholder="e.g. 2026-03" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Source</label>
            <input className={styles.input} placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId !== null ? "Update Indicator" : "Add Indicator"}
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
            placeholder="Search indicator, code, currency"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select className={styles.select} value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            {currencyOptions.map((opt) => (
              <option key={opt} value={opt}>{opt === "ALL" ? "All currencies" : opt}</option>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className={editingId === row.id ? styles.editingRow : undefined}>
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
