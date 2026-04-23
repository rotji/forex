export interface SignalEngineStatus {
  running: boolean;
  intervalMs: number | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastDurationMs: number | null;
  lastExpiredCount: number;
  lastCleanedCount: number;
  lastBiasCount: number;
  lastGeneratedAlertsCount: number;
  lastError: string | null;
}

const state: SignalEngineStatus = {
  running: false,
  intervalMs: null,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastDurationMs: null,
  lastExpiredCount: 0,
  lastCleanedCount: 0,
  lastBiasCount: 0,
  lastGeneratedAlertsCount: 0,
  lastError: null,
};

export function getSignalEngineStatus(): SignalEngineStatus {
  return { ...state };
}

export function markSignalEngineRunning(intervalMs: number): void {
  state.running = true;
  state.intervalMs = intervalMs;
}

export function markSignalEngineCycleStart(iso: string): void {
  state.lastStartedAt = iso;
  state.lastError = null;
}

export function markSignalEngineCycleSuccess(params: {
  completedAt: string;
  durationMs: number;
  expiredCount: number;
  cleanedCount: number;
  biasCount: number;
  generatedAlertsCount: number;
}): void {
  state.lastCompletedAt = params.completedAt;
  state.lastDurationMs = params.durationMs;
  state.lastExpiredCount = params.expiredCount;
  state.lastCleanedCount = params.cleanedCount;
  state.lastBiasCount = params.biasCount;
  state.lastGeneratedAlertsCount = params.generatedAlertsCount;
  state.lastError = null;
}

export function markSignalEngineCycleError(message: string): void {
  state.lastError = message;
}
