export interface SignalEngineStatus {
  running: boolean;
  intervalMs: number | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastDurationMs: number | null;
  lastIngestionAt: string | null;
  lastIngestionProvider: string | null;
  lastIngestionFetchedAt: string | null;
  lastIngestionMacroInserted: number;
  lastIngestionMacroUpdated: number;
  lastIngestionMacroSkipped: number;
  lastIngestionCbInserted: number;
  lastIngestionCbUpdated: number;
  lastIngestionCbSkipped: number;
  lastIngestionError: string | null;
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
  lastIngestionAt: null,
  lastIngestionProvider: null,
  lastIngestionFetchedAt: null,
  lastIngestionMacroInserted: 0,
  lastIngestionMacroUpdated: 0,
  lastIngestionMacroSkipped: 0,
  lastIngestionCbInserted: 0,
  lastIngestionCbUpdated: 0,
  lastIngestionCbSkipped: 0,
  lastIngestionError: null,
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
  ingestionAt: string;
  ingestionProvider: string;
  ingestionFetchedAt: string | null;
  ingestionMacroInserted: number;
  ingestionMacroUpdated: number;
  ingestionMacroSkipped: number;
  ingestionCbInserted: number;
  ingestionCbUpdated: number;
  ingestionCbSkipped: number;
  ingestionError: string | null;
  expiredCount: number;
  cleanedCount: number;
  biasCount: number;
  generatedAlertsCount: number;
}): void {
  state.lastCompletedAt = params.completedAt;
  state.lastDurationMs = params.durationMs;
  state.lastIngestionAt = params.ingestionAt;
  state.lastIngestionProvider = params.ingestionProvider;
  state.lastIngestionFetchedAt = params.ingestionFetchedAt;
  state.lastIngestionMacroInserted = params.ingestionMacroInserted;
  state.lastIngestionMacroUpdated = params.ingestionMacroUpdated;
  state.lastIngestionMacroSkipped = params.ingestionMacroSkipped;
  state.lastIngestionCbInserted = params.ingestionCbInserted;
  state.lastIngestionCbUpdated = params.ingestionCbUpdated;
  state.lastIngestionCbSkipped = params.ingestionCbSkipped;
  state.lastIngestionError = params.ingestionError;
  state.lastExpiredCount = params.expiredCount;
  state.lastCleanedCount = params.cleanedCount;
  state.lastBiasCount = params.biasCount;
  state.lastGeneratedAlertsCount = params.generatedAlertsCount;
  state.lastError = null;
}

export function markSignalEngineCycleError(message: string): void {
  state.lastError = message;
}
