import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "../hooks/useQuery";
import { signalsService } from "../services/signals.service";
import type { Signal } from "../types";
import styles from "./EventsPage.module.css";

const signalColor: Record<string, string> = {
  BUY: styles.low,
  SELL: styles.high,
  NEUTRAL: styles.medium,
};

export function SignalsPage() {
  const fetcher = useCallback(() => signalsService.getActive(), []);
  const { data, loading, error, refetch } = useQuery<Signal[]>(fetcher);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [pairSymbol, setPairSymbol] = useState("EUR/USD");
  const [signalType, setSignalType] = useState<"BUY" | "SELL" | "NEUTRAL">("BUY");
  const [timeframe, setTimeframe] = useState("1h");
  const [strength, setStrength] = useState("0.7");
  const [reasoning, setReasoning] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [searchText, setSearchText] = useState("");
  const [signalFilter, setSignalFilter] = useState<"ALL" | "BUY" | "SELL" | "NEUTRAL">("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<"ALL" | Signal["timeframe"]>("ALL");

  function resetForm() {
    setPairSymbol("EUR/USD");
    setSignalType("BUY");
    setTimeframe("1h");
    setStrength("0.7");
    setReasoning("");
    setExpiresAt("");
    setEditingId(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function startEditing(signal: Signal) {
    setEditingId(signal.id);
    setPairSymbol(signal.pair_symbol);
    setSignalType(signal.signal_type);
    setTimeframe(signal.timeframe);
    setStrength(signal.strength != null ? String(signal.strength) : "");
    setReasoning(signal.reasoning ?? "");
    if (signal.expires_at) {
      const dt = new Date(signal.expires_at);
      const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setExpiresAt(local);
    } else {
      setExpiresAt("");
    }
    setSubmitError(null);
    setSubmitSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this signal? This cannot be undone.")) return;
    try {
      await signalsService.remove(id);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete signal.");
    }
  }

  const filteredSignals = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return (data ?? []).filter((signal) => {
      const matchesQuery =
        !query ||
        signal.pair_symbol.toLowerCase().includes(query) ||
        (signal.reasoning ?? "").toLowerCase().includes(query);
      const matchesSignalType = signalFilter === "ALL" || signal.signal_type === signalFilter;
      const matchesTimeframe = timeframeFilter === "ALL" || signal.timeframe === timeframeFilter;
      return matchesQuery && matchesSignalType && matchesTimeframe;
    });
  }, [data, searchText, signalFilter, timeframeFilter]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!pairSymbol.trim()) {
      setSubmitError("Pair symbol is required.");
      return;
    }

    const strengthNumber = strength.trim() ? Number(strength) : undefined;
    if (strength.trim() && Number.isNaN(strengthNumber)) {
      setSubmitError("Strength must be a valid number.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId !== null) {
        await signalsService.update(editingId, {
          signalType,
          timeframe: timeframe as Signal["timeframe"],
          strength: strengthNumber ?? null,
          reasoning: reasoning.trim() || null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
        setSubmitSuccess("Signal updated successfully.");
        setEditingId(null);
      } else {
        await signalsService.create({
          pairSymbol: pairSymbol.toUpperCase(),
          signalType,
          timeframe: timeframe as Signal["timeframe"],
          strength: strengthNumber,
          reasoning: reasoning.trim() || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        });
        setReasoning("");
        setSubmitSuccess("Signal created successfully.");
      }
      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save signal.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading signals...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Active Signals</h1>
      <p className={styles.sub}>{data?.length ?? 0} active signals</p>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>{editingId !== null ? "Edit Signal" : "Add Signal"}</h2>
        <div className={styles.formGrid}>
          <input
            className={styles.input}
            placeholder="Pair (e.g. EUR/USD)"
            value={pairSymbol}
            disabled={editingId !== null}
            onChange={(e) => setPairSymbol(e.target.value.toUpperCase())}
          />
          <select className={styles.select} value={signalType} onChange={(e) => setSignalType(e.target.value as "BUY" | "SELL" | "NEUTRAL")}>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="NEUTRAL">NEUTRAL</option>
          </select>
          <select className={styles.select} value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
            <option value="1w">1w</option>
          </select>
          <input className={styles.input} placeholder="Strength (0-1)" value={strength} onChange={(e) => setStrength(e.target.value)} />
          <input className={styles.input} type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          <input className={styles.input} placeholder="Reasoning" value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
        </div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId !== null ? "Update Signal" : "Create Signal"}
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
            placeholder="Search pair or reasoning"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select className={styles.select} value={signalFilter} onChange={(e) => setSignalFilter(e.target.value as "ALL" | "BUY" | "SELL" | "NEUTRAL")}>
            <option value="ALL">All signal types</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="NEUTRAL">NEUTRAL</option>
          </select>
          <select
            className={styles.select}
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value as "ALL" | Signal["timeframe"])}
          >
            <option value="ALL">All timeframes</option>
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
            <option value="1w">1w</option>
          </select>
        </div>
        <p className={styles.meta}>Showing {filteredSignals.length} of {data?.length ?? 0} signals</p>
      </section>

      {filteredSignals.length === 0 ? (
        <p>No active signals at this time.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Signal</th>
              <th>Timeframe</th>
              <th>Strength</th>
              <th>Generated</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSignals.map((s) => (
              <tr key={s.id} className={editingId === s.id ? styles.editingRow : undefined}>
                <td>{s.pair_symbol}</td>
                <td>
                  <span className={`${styles.impact} ${signalColor[s.signal_type] ?? ""}`}>
                    {s.signal_type}
                  </span>
                </td>
                <td>{s.timeframe}</td>
                <td>{s.strength != null ? `${(s.strength * 100).toFixed(0)}%` : "-"}</td>
                <td>{new Date(s.generated_at).toLocaleString()}</td>
                <td>{s.expires_at ? new Date(s.expires_at).toLocaleString() : "-"}</td>
                <td className={styles.rowActions}>
                  <button className={styles.editBtn} type="button" onClick={() => startEditing(s)}>Edit</button>
                  <button className={styles.deleteBtn} type="button" onClick={() => void handleDelete(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
