import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "../hooks/useQuery";
import { setupsService } from "../services/setups.service";
import type { TradeSetup } from "../types";
import styles from "./EventsPage.module.css";

const statusColor: Record<string, string> = {
  PENDING: styles.medium,
  ACTIVE: styles.low,
  HIT_TP: styles.low,
  HIT_SL: styles.high,
  CANCELLED: styles.high,
};

export function SetupsPage() {
  const fetcher = useCallback(() => setupsService.getActive(), []);
  const { data, loading, error, refetch } = useQuery<TradeSetup[]>(fetcher);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [pairSymbol, setPairSymbol] = useState("EUR/USD");
  const [entryPrice, setEntryPrice] = useState("1.085");
  const [stopLoss, setStopLoss] = useState("1.08");
  const [takeProfit1, setTakeProfit1] = useState("1.091");
  const [takeProfit2, setTakeProfit2] = useState("");
  const [riskRewardRatio, setRiskRewardRatio] = useState("");
  const [lotSizeSuggestion, setLotSizeSuggestion] = useState("");
  const [status, setStatus] = useState<TradeSetup["status"]>("PENDING");
  const [notes, setNotes] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TradeSetup["status"]>("ALL");

  function resetForm() {
    setPairSymbol("EUR/USD");
    setEntryPrice("1.085");
    setStopLoss("1.08");
    setTakeProfit1("1.091");
    setTakeProfit2("");
    setRiskRewardRatio("");
    setLotSizeSuggestion("");
    setStatus("PENDING");
    setNotes("");
    setEditingId(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function startEditing(setup: TradeSetup) {
    setEditingId(setup.id);
    setPairSymbol(setup.pair_symbol);
    setEntryPrice(String(setup.entry_price));
    setStopLoss(String(setup.stop_loss));
    setTakeProfit1(String(setup.take_profit_1));
    setTakeProfit2(setup.take_profit_2 != null ? String(setup.take_profit_2) : "");
    setRiskRewardRatio(setup.risk_reward_ratio != null ? String(setup.risk_reward_ratio) : "");
    setLotSizeSuggestion(setup.lot_size_suggestion != null ? String(setup.lot_size_suggestion) : "");
    setStatus(setup.status);
    setNotes(setup.notes ?? "");
    setSubmitError(null);
    setSubmitSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this trade setup? This cannot be undone.")) return;
    try {
      await setupsService.remove(id);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete trade setup.");
    }
  }

  const filteredSetups = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return (data ?? []).filter((setup) => {
      const matchesQuery =
        !query ||
        setup.pair_symbol.toLowerCase().includes(query) ||
        (setup.notes ?? "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "ALL" || setup.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [data, searchText, statusFilter]);

  function asRequiredNumber(value: string, fieldName: string): number {
    const n = Number(value);
    if (Number.isNaN(n)) throw new Error(`${fieldName} must be a valid number.`);
    return n;
  }

  function asOptionalNumber(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const n = Number(value);
    if (Number.isNaN(n)) throw new Error("Optional numeric fields must be valid numbers.");
    return n;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!pairSymbol.trim()) {
      setSubmitError("Pair symbol is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId !== null) {
        await setupsService.update(editingId, {
          pairSymbol: pairSymbol.toUpperCase(),
          entryPrice: asRequiredNumber(entryPrice, "Entry price"),
          stopLoss: asRequiredNumber(stopLoss, "Stop loss"),
          takeProfit1: asRequiredNumber(takeProfit1, "Take profit 1"),
          takeProfit2: asOptionalNumber(takeProfit2) ?? null,
          riskRewardRatio: asOptionalNumber(riskRewardRatio) ?? null,
          lotSizeSuggestion: asOptionalNumber(lotSizeSuggestion) ?? null,
          status,
          notes: notes.trim() || null,
        });
        setSubmitSuccess("Trade setup updated successfully.");
        setEditingId(null);
      } else {
        await setupsService.create({
          pairSymbol: pairSymbol.toUpperCase(),
          entryPrice: asRequiredNumber(entryPrice, "Entry price"),
          stopLoss: asRequiredNumber(stopLoss, "Stop loss"),
          takeProfit1: asRequiredNumber(takeProfit1, "Take profit 1"),
          takeProfit2: asOptionalNumber(takeProfit2),
          riskRewardRatio: asOptionalNumber(riskRewardRatio),
          lotSizeSuggestion: asOptionalNumber(lotSizeSuggestion),
          status,
          notes: notes.trim() || undefined,
        });
        setTakeProfit2("");
        setRiskRewardRatio("");
        setLotSizeSuggestion("");
        setNotes("");
        setSubmitSuccess("Trade setup created successfully.");
      }
      refetch();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save trade setup.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading trade setups...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Trade Setups</h1>
      <p className={styles.sub}>{data?.length ?? 0} active setups</p>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>{editingId !== null ? "Edit Trade Setup" : "Add Trade Setup"}</h2>
        <div className={styles.formGrid}>
          <input
            className={styles.input}
            placeholder="Pair (e.g. EUR/USD)"
            value={pairSymbol}
            disabled={editingId !== null}
            onChange={(e) => setPairSymbol(e.target.value.toUpperCase())}
          />
          <input className={styles.input} placeholder="Entry price" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
          <input className={styles.input} placeholder="Stop loss" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
          <input className={styles.input} placeholder="Take profit 1" value={takeProfit1} onChange={(e) => setTakeProfit1(e.target.value)} />
          <input className={styles.input} placeholder="Take profit 2 (optional)" value={takeProfit2} onChange={(e) => setTakeProfit2(e.target.value)} />
          <input className={styles.input} placeholder="Risk/Reward ratio (optional)" value={riskRewardRatio} onChange={(e) => setRiskRewardRatio(e.target.value)} />
          <input className={styles.input} placeholder="Lot size suggestion (optional)" value={lotSizeSuggestion} onChange={(e) => setLotSizeSuggestion(e.target.value)} />
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as TradeSetup["status"])}>
            <option value="PENDING">PENDING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="HIT_TP">HIT_TP</option>
            <option value="HIT_SL">HIT_SL</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <textarea className={styles.textarea} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId !== null ? "Update Setup" : "Create Setup"}
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
            placeholder="Search pair or notes"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | TradeSetup["status"])}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="HIT_TP">HIT_TP</option>
            <option value="HIT_SL">HIT_SL</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <p className={styles.meta}>Showing {filteredSetups.length} of {data?.length ?? 0} trade setups</p>
      </section>
      {filteredSetups.length === 0 ? (
        <p>No trade setups available.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Entry</th>
              <th>Stop Loss</th>
              <th>TP1</th>
              <th>TP2</th>
              <th>R:R</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSetups.map((s) => (
              <tr key={s.id} className={editingId === s.id ? styles.editingRow : undefined}>
                <td>{s.pair_symbol}</td>
                <td>{s.entry_price}</td>
                <td>{s.stop_loss}</td>
                <td>{s.take_profit_1}</td>
                <td>{s.take_profit_2 ?? "-"}</td>
                <td>{s.risk_reward_ratio ?? "-"}</td>
                <td>
                  <span className={`${styles.impact} ${statusColor[s.status] ?? ""}`}>
                    {s.status}
                  </span>
                </td>
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
