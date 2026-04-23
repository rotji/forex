export type ThemeAccent = "TEAL" | "BLUE" | "AMBER";

export interface OperatorSettings {
  alertFreshnessHours: number;
  biasBarMax: number;
  themeAccent: ThemeAccent;
}

const SETTINGS_KEY = "forexintel.operatorSettings.v1";

export const DEFAULT_OPERATOR_SETTINGS: OperatorSettings = {
  alertFreshnessHours: 24,
  biasBarMax: 0.5,
  themeAccent: "TEAL",
};

function parseSettings(raw: unknown): OperatorSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_OPERATOR_SETTINGS;
  const candidate = raw as Partial<OperatorSettings>;

  const alertFreshnessHours =
    typeof candidate.alertFreshnessHours === "number" && candidate.alertFreshnessHours > 0
      ? candidate.alertFreshnessHours
      : DEFAULT_OPERATOR_SETTINGS.alertFreshnessHours;

  const biasBarMax =
    typeof candidate.biasBarMax === "number" && candidate.biasBarMax > 0
      ? candidate.biasBarMax
      : DEFAULT_OPERATOR_SETTINGS.biasBarMax;

  const themeAccent =
    candidate.themeAccent === "TEAL" || candidate.themeAccent === "BLUE" || candidate.themeAccent === "AMBER"
      ? candidate.themeAccent
      : DEFAULT_OPERATOR_SETTINGS.themeAccent;

  return { alertFreshnessHours, biasBarMax, themeAccent };
}

export function getOperatorSettings(): OperatorSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_OPERATOR_SETTINGS;
    return parseSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_OPERATOR_SETTINGS;
  }
}

export function saveOperatorSettings(next: OperatorSettings): OperatorSettings {
  const normalized = parseSettings(next);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  applyThemeAccent(normalized.themeAccent);
  return normalized;
}

export function applyThemeAccent(accent: ThemeAccent) {
  const root = document.documentElement;
  if (accent === "BLUE") {
    root.style.setProperty("--accent", "#1d4ed8");
    root.style.setProperty("--accent-soft", "#dbeafe");
    return;
  }

  if (accent === "AMBER") {
    root.style.setProperty("--accent", "#b45309");
    root.style.setProperty("--accent-soft", "#fef3c7");
    return;
  }

  root.style.setProperty("--accent", "#0f766e");
  root.style.setProperty("--accent-soft", "#ecfeff");
}
