import { useEffect, useState, type FormEvent } from "react";
import {
  DEFAULT_OPERATOR_SETTINGS,
  getOperatorSettings,
  saveOperatorSettings,
  type OperatorSettings,
  type ThemeAccent,
} from "../services/settings.service";
import styles from "./EventsPage.module.css";

export function SettingsPage() {
  const [settings, setSettings] = useState<OperatorSettings>(DEFAULT_OPERATOR_SETTINGS);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setSettings(getOperatorSettings());
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const saved = saveOperatorSettings(settings);
    setSettings(saved);
    setSuccessMessage("Settings saved and applied.");
    window.setTimeout(() => setSuccessMessage(null), 2500);
  }

  function handleReset() {
    const saved = saveOperatorSettings(DEFAULT_OPERATOR_SETTINGS);
    setSettings(saved);
    setSuccessMessage("Settings reset to defaults.");
    window.setTimeout(() => setSuccessMessage(null), 2500);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>
      <p className={styles.sub}>Operator preferences for alert freshness, bias scale, and platform theme.</p>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>Platform Preferences</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Alert Freshness Threshold (hours)</label>
            <input
              className={styles.input}
              type="number"
              min={1}
              step={1}
              value={settings.alertFreshnessHours}
              onChange={(e) => setSettings((prev) => ({ ...prev, alertFreshnessHours: Number(e.target.value) || 1 }))}
            />
            <span className={styles.fieldHint}>Used on Trade Alerts to classify Fresh / Aging / Stale.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Bias Bar Max Range</label>
            <input
              className={styles.input}
              type="number"
              min={0.1}
              step={0.1}
              value={settings.biasBarMax}
              onChange={(e) => setSettings((prev) => ({ ...prev, biasBarMax: Number(e.target.value) || 0.5 }))}
            />
            <span className={styles.fieldHint}>Scales contribution bars on Currency Bias and detail panels.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Theme Accent</label>
            <select
              className={styles.select}
              value={settings.themeAccent}
              onChange={(e) => setSettings((prev) => ({ ...prev, themeAccent: e.target.value as ThemeAccent }))}
            >
              <option value="TEAL">Teal</option>
              <option value="BLUE">Blue</option>
              <option value="AMBER">Amber</option>
            </select>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.button} type="submit">Save Settings</button>
          <button className={styles.buttonSecondary} type="button" onClick={handleReset}>Reset Defaults</button>
          {successMessage && <p className={styles.success}>{successMessage}</p>}
        </div>
      </form>
    </div>
  );
}
