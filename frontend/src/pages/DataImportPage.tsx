import { useMemo, useState, type FormEvent } from "react";
import { dataImportService } from "../services/data-import.service";
import type { CsvImportDataset, CsvImportResponse } from "../types";
import styles from "./EventsPage.module.css";

const DATASET_OPTIONS: Array<{ value: CsvImportDataset; label: string }> = [
  { value: "macro-indicators", label: "Macro Indicators" },
  { value: "economic-events", label: "Economic Events" },
  { value: "central-bank-events", label: "Central Bank Events" },
  { value: "risk-sentiment", label: "Risk Sentiment" },
  { value: "positioning", label: "Positioning" },
];

// Each entry: header row + 2 example data rows (tab-separated for readability, joined by \n for CSV)
const TEMPLATE_CSV: Record<CsvImportDataset, string> = {
  "macro-indicators": [
    "indicator_code,indicator_name,currency,value,previous_value,forecast_value,unit,importance,signal_direction,period,released_at,source",
    "CPI_YOY,CPI Year-over-Year,USD,3.2,3.4,3.1,%,HIGH,HIGHER_IS_BULLISH,2025-03,2025-04-10T12:30:00Z,BLS",
    "UNEMPLOYMENT,Unemployment Rate,EUR,6.1,6.3,,%, MEDIUM,LOWER_IS_BULLISH,2025-03,2025-04-08T09:00:00Z,Eurostat",
  ].join("\n"),

  "economic-events": [
    "title,currency,impact,scheduled_at,actual_value,forecast_value,previous_value,source",
    "Non-Farm Payrolls,USD,HIGH,2025-05-02T12:30:00Z,175K,168K,160K,BLS",
    "ECB Interest Rate Decision,EUR,HIGH,2025-06-06T11:45:00Z,,,4.25%,ECB",
  ].join("\n"),

  "central-bank-events": [
    "bank_code,bank_name,title,event_type,currency,scheduled_at,expected_value,actual_value,outcome_tone,source",
    "FED,Federal Reserve,FOMC Rate Decision,RATE_DECISION,USD,2025-05-07T18:00:00Z,5.25%,5.50%,HAWKISH,Federal Reserve",
    "ECB,European Central Bank,ECB Governing Council Speech,SPEECH,EUR,2025-05-15T10:00:00Z,,,DOVISH,ECB",
  ].join("\n"),

  "risk-sentiment": [
    "regime,vix_level,dxy_bias,yields_bias,equities_tone,commodities_tone,recorded_at,notes,source",
    "RISK_OFF,28.5,BULLISH,BULLISH,BEARISH,BEARISH,2025-04-22T08:00:00Z,Flight to safety on geopolitical risk,Manual",
    "RISK_ON,14.2,NEUTRAL,NEUTRAL,BULLISH,BULLISH,2025-04-15T08:00:00Z,Strong risk appetite on earnings,Manual",
  ].join("\n"),

  positioning: [
    "currency,bias,conviction,net_position_ratio,recorded_at,notes,source",
    "USD,BULLISH,HIGH,0.65,2025-04-22T00:00:00Z,COT report net long,CFTC COT",
    "EUR,BEARISH,MEDIUM,-0.30,2025-04-22T00:00:00Z,Speculative shorts building,CFTC COT",
  ].join("\n"),
};

const TEMPLATE_HEADERS: Record<CsvImportDataset, string> = {
  "macro-indicators":
    "indicator_code,indicator_name,currency,value,previous_value,forecast_value,unit,importance,signal_direction,period,released_at,source",
  "economic-events":
    "title,currency,impact,scheduled_at,actual_value,forecast_value,previous_value,source",
  "central-bank-events":
    "bank_code,bank_name,title,event_type,currency,scheduled_at,expected_value,actual_value,outcome_tone,source",
  "risk-sentiment":
    "regime,vix_level,dxy_bias,yields_bias,equities_tone,commodities_tone,recorded_at,notes,source",
  positioning: "currency,bias,conviction,net_position_ratio,recorded_at,notes,source",
};

function downloadTemplate(dataset: CsvImportDataset, label: string): void {
  const csv = TEMPLATE_CSV[dataset];
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template-${dataset}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataImportPage() {
  const [dataset, setDataset] = useState<CsvImportDataset>("macro-indicators");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportResponse | null>(null);

  const template = useMemo(() => TEMPLATE_HEADERS[dataset], [dataset]);
  const currentLabel = useMemo(
    () => DATASET_OPTIONS.find((o) => o.value === dataset)?.label ?? dataset,
    [dataset],
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Please choose a CSV file.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await dataImportService.importCsv(dataset, file);
      setResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>CSV Import</h1>
      <p className={styles.sub}>Bulk upload manual inputs with row-level error reporting</p>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>Upload CSV</h2>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Dataset</label>
            <select
              className={styles.select}
              value={dataset}
              onChange={(e) => {
                setDataset(e.target.value as CsvImportDataset);
                setResult(null);
                setError(null);
              }}
            >
              {DATASET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>CSV File</label>
            <input
              className={styles.input}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <p className={styles.meta}>
          <strong>Expected headers:</strong> {template}
        </p>

        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Importing..." : "Import CSV"}
          </button>
          <button
            className={styles.buttonSecondary}
            type="button"
            onClick={() => downloadTemplate(dataset, currentLabel)}
          >
            Download Template
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </form>

      <section className={styles.filterCard}>
        <h2 className={styles.filterTitle}>Accepted Values Reference</h2>
        <ul className={styles.meta} style={{ paddingLeft: "1.2rem", lineHeight: "1.8" }}>
          <li><strong>importance / impact:</strong> LOW · MEDIUM · HIGH</li>
          <li><strong>signal_direction:</strong> HIGHER_IS_BULLISH · LOWER_IS_BULLISH</li>
          <li><strong>event_type (central bank):</strong> RATE_DECISION · SPEECH · MINUTES · PRESS_CONFERENCE · INTERVENTION</li>
          <li><strong>outcome_tone:</strong> DOVISH · NEUTRAL · HAWKISH</li>
          <li><strong>regime:</strong> RISK_ON · NEUTRAL · RISK_OFF</li>
          <li><strong>bias / dxy_bias / yields_bias / equities_tone / commodities_tone:</strong> BULLISH · NEUTRAL · BEARISH</li>
          <li><strong>conviction:</strong> LOW · MEDIUM · HIGH</li>
          <li><strong>dates (released_at / scheduled_at / recorded_at):</strong> ISO 8601 — e.g. <code>2025-04-22T12:30:00Z</code></li>
        </ul>
      </section>

      {result && (
        <section className={styles.filterCard}>
          <h2 className={styles.filterTitle}>Import Result</h2>
          <p className={styles.meta}>
            Dataset: <strong>{result.dataset}</strong> · Total rows: <strong>{result.totalRows}</strong> · Inserted: <strong>{result.inserted}</strong> · Failed: <strong>{result.failed}</strong>
          </p>

          {result.errors.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((row) => (
                  <tr key={`${row.row}-${row.message}`}>
                    <td>{row.row}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.success}>All rows imported successfully.</p>
          )}
        </section>
      )}
    </div>
  );
}
