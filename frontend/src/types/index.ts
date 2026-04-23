export type SignalType = "BUY" | "SELL" | "NEUTRAL";
export type ImpactLevel = "LOW" | "MEDIUM" | "HIGH";
export type TradeStatus = "PENDING" | "ACTIVE" | "HIT_TP" | "HIT_SL" | "CANCELLED";
export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";
export type CentralBankTone = "DOVISH" | "NEUTRAL" | "HAWKISH";
export type BiasLabel = "BULLISH" | "NEUTRAL" | "BEARISH";
export type RiskRegime = "RISK_ON" | "NEUTRAL" | "RISK_OFF";
export type PositioningConviction = "LOW" | "MEDIUM" | "HIGH";

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  country: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CurrencyPair {
  id: number;
  base_currency: string;
  quote_currency: string;
  pair_symbol: string;
  pip_value: number | null;
  is_major: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EconomicEvent {
  id: number;
  title: string;
  currency: string;
  impact: ImpactLevel;
  scheduled_at: string;
  actual_value: string | null;
  forecast_value: string | null;
  previous_value: string | null;
  source: string | null;
  created_at: string;
}

export interface Signal {
  id: number;
  pair_symbol: string;
  signal_type: SignalType;
  timeframe: Timeframe;
  strength: number | null;
  reasoning: string | null;
  generated_at: string;
  expires_at: string | null;
  is_active: number;
}

export interface TradeSetup {
  id: number;
  signal_id: number | null;
  pair_symbol: string;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number | null;
  take_profit_3: number | null;
  risk_reward_ratio: number | null;
  lot_size_suggestion: number | null;
  notes: string | null;
  status: TradeStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateEconomicEventInput {
  title: string;
  currency: string;
  impact: ImpactLevel;
  scheduledAt: string;
  actualValue?: string;
  forecastValue?: string;
  previousValue?: string;
  source?: string;
}

export interface CreateSignalInput {
  pairSymbol: string;
  signalType: SignalType;
  timeframe: Timeframe;
  strength?: number;
  reasoning?: string;
  expiresAt?: string;
}

export interface CreateTradeSetupInput {
  signalId?: number;
  pairSymbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  riskRewardRatio?: number;
  lotSizeSuggestion?: number;
  notes?: string;
  status?: TradeStatus;
}

export interface UpdateEconomicEventInput {
  title?: string;
  currency?: string;
  impact?: ImpactLevel;
  scheduledAt?: string;
  actualValue?: string | null;
  forecastValue?: string | null;
  previousValue?: string | null;
  source?: string | null;
}

export interface UpdateSignalInput {
  signalType?: SignalType;
  timeframe?: Timeframe;
  strength?: number | null;
  reasoning?: string | null;
  expiresAt?: string | null;
}

export interface UpdateTradeSetupInput {
  pairSymbol?: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  riskRewardRatio?: number | null;
  lotSizeSuggestion?: number | null;
  notes?: string | null;
  status?: TradeStatus;
}

export interface MacroIndicator {
  id: number;
  indicator_code: string;
  indicator_name: string;
  currency: string;
  value: number | null;
  previous_value: number | null;
  forecast_value: number | null;
  unit: string | null;
  importance: ImpactLevel;
  signal_direction: "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH";
  period: string | null;
  released_at: string;
  source: string | null;
  created_at: string;
}

export interface CentralBankEvent {
  id: number;
  bank_code: string;
  bank_name: string;
  title: string;
  event_type: "RATE_DECISION" | "SPEECH" | "MINUTES" | "PRESS_CONFERENCE" | "INTERVENTION";
  currency: string;
  scheduled_at: string;
  expected_value: string | null;
  actual_value: string | null;
  outcome_tone: CentralBankTone | null;
  source: string | null;
  created_at: string;
}

export interface CurrencyBiasSnapshot {
  id: number;
  currency: string;
  score: number;
  bias: BiasLabel;
  confidence: number;
  drivers: string | null;
  breakdown: string | null;
  computed_at: string;
}

export interface RiskSentimentSnapshot {
  id: number;
  regime: RiskRegime;
  vix_level: number | null;
  dxy_bias: BiasLabel;
  yields_bias: BiasLabel;
  equities_tone: BiasLabel;
  commodities_tone: BiasLabel;
  notes: string | null;
  source: string | null;
  recorded_at: string;
  created_at: string;
}

export interface PositioningSnapshot {
  id: number;
  currency: string;
  bias: BiasLabel;
  conviction: PositioningConviction;
  net_position_ratio: number | null;
  source: string | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export interface CreatePositioningInput {
  currency: string;
  bias: BiasLabel;
  conviction: PositioningConviction;
  net_position_ratio?: number | null;
  source?: string;
  notes?: string;
  recorded_at: string;
}

export interface UpdatePositioningInput {
  currency?: string;
  bias?: BiasLabel;
  conviction?: PositioningConviction;
  net_position_ratio?: number | null;
  source?: string | null;
  notes?: string | null;
  recorded_at?: string;
}

export interface CreateRiskSentimentInput {
  regime: RiskRegime;
  vix_level?: number | null;
  dxy_bias: BiasLabel;
  yields_bias: BiasLabel;
  equities_tone: BiasLabel;
  commodities_tone: BiasLabel;
  notes?: string;
  source?: string;
  recorded_at: string;
}

export interface UpdateRiskSentimentInput {
  regime?: RiskRegime;
  vix_level?: number | null;
  dxy_bias?: BiasLabel;
  yields_bias?: BiasLabel;
  equities_tone?: BiasLabel;
  commodities_tone?: BiasLabel;
  notes?: string | null;
  source?: string | null;
  recorded_at?: string;
}

export interface BiasBreakdown {
  macro: number;
  events: number;
  centralBank: number;
  riskSentiment: number;
  positioning: number;
}

export interface RecomputeBiasResponseRow {
  currency: string;
  score: number;
  bias: BiasLabel;
  confidence: number;
  drivers: string;
  breakdown: string;
  computedAt: string;
}

export interface RecomputeBiasResponse {
  count: number;
  macroIndicatorsCount: number;
  economicEventsCount: number;
  centralBankEventsCount: number;
  riskSentimentCount: number;
  positioningCount: number;
  generatedAlertsCount: number;
  computedAt: string;
  rows: RecomputeBiasResponseRow[];
}

export type CsvImportDataset =
  | "macro-indicators"
  | "economic-events"
  | "central-bank-events"
  | "risk-sentiment"
  | "positioning";

export interface CsvImportErrorRow {
  row: number;
  message: string;
}

export interface CsvImportResponse {
  dataset: CsvImportDataset;
  totalRows: number;
  inserted: number;
  failed: number;
  errors: CsvImportErrorRow[];
}

export interface TradeAlert {
  id: number;
  pair_symbol: string;
  base_currency: string | null;
  quote_currency: string | null;
  direction: SignalType;
  confidence: number;
  base_score: number | null;
  quote_score: number | null;
  score_diff: number | null;
  rationale: string | null;
  triggered_at: string;
  expires_at: string | null;
  status: "ACTIVE" | "ACKNOWLEDGED" | "EXPIRED";
}

export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "EXPIRED" | "ALL";

export interface GenerateAlertsResponseAlert {
  pairSymbol: string;
  direction: "BUY" | "SELL";
  confidence: number;
  rationale: string;
  expiresAt: string;
}

export interface GenerateAlertsResponse {
  count: number;
  generatedAt: string;
  alerts: GenerateAlertsResponseAlert[];
}

export interface AcknowledgeBulkAlertsResponse {
  updated: number;
}

export interface CleanupExpiredAlertsResponse {
  deleted: number;
  olderThanDays: number;
}

export type CurrencyBiasHistoryMap = Record<string, CurrencyBiasSnapshot[]>;

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

export interface SignalEngineCycleResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  expiredCount: number;
  cleanedCount: number;
  biasCount: number;
  generatedAlertsCount: number;
  error: string | null;
}

export interface RunSignalEngineNowResponse {
  message: string;
  result: SignalEngineCycleResult;
  status: SignalEngineStatus;
}

export interface OpsRunAuditRecord {
  id: number;
  trigger_source: string;
  requested_at: string;
  completed_at: string | null;
  success: number;
  message: string | null;
  expired_count: number | null;
  cleaned_count: number | null;
  bias_count: number | null;
  generated_alerts_count: number | null;
  duration_ms: number | null;
  request_ip: string | null;
}

export interface OpsHealthSummary {
  healthy: boolean;
  dbReachable: boolean;
  schedulerEnabled: boolean;
  intervalMs: number | null;
  lastCompletedAt: string | null;
  lastCycleAgeSeconds: number | null;
  lastIngestionAt: string | null;
  lastIngestionAgeSeconds: number | null;
  lastIngestionProvider: string | null;
  lastIngestionFetchedAt: string | null;
  lastIngestionMacroInserted: number;
  lastIngestionMacroUpdated: number;
  lastIngestionMacroSkipped: number;
  lastIngestionCbInserted: number;
  lastIngestionCbUpdated: number;
  lastIngestionCbSkipped: number;
  lastIngestionError: string | null;
  stale: boolean;
  staleThresholdSeconds: number | null;
  lastDurationMs: number | null;
  lastError: string | null;
  healthReason: string | null;
  opsRunKeyConfigured: boolean;
}

export interface IngestionRunRecord {
  id: number;
  provider: string;
  started_at: string;
  completed_at: string | null;
  success: number;
  macro_inserted: number;
  macro_updated: number;
  macro_skipped: number;
  cb_inserted: number;
  cb_updated: number;
  cb_skipped: number;
  error_message: string | null;
  fetched_at: string | null;
  created_at: string;
}

export interface IngestionCycleResult {
  success: boolean;
  provider: string;
  startedAt: string;
  completedAt: string;
  fetchedAt: string | null;
  macroInserted: number;
  macroUpdated: number;
  macroSkipped: number;
  cbInserted: number;
  cbUpdated: number;
  cbSkipped: number;
  error: string | null;
}

export interface RunIngestionNowResponse {
  message: string;
  result: IngestionCycleResult;
  status: SignalEngineStatus;
  runs: IngestionRunRecord[];
}

export interface CreateMacroIndicatorInput {
  indicator_code: string;
  indicator_name: string;
  currency: string;
  value?: number | null;
  previous_value?: number | null;
  forecast_value?: number | null;
  unit?: string | null;
  importance: ImpactLevel;
  signal_direction: "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH";
  period?: string | null;
  released_at: string;
  source?: string | null;
}

export interface UpdateMacroIndicatorInput {
  indicator_code?: string;
  indicator_name?: string;
  currency?: string;
  value?: number | null;
  previous_value?: number | null;
  forecast_value?: number | null;
  unit?: string | null;
  importance?: ImpactLevel;
  signal_direction?: "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH";
  period?: string | null;
  released_at?: string;
  source?: string | null;
}

export interface CreateCentralBankEventInput {
  bank_code: string;
  bank_name: string;
  title: string;
  event_type: "RATE_DECISION" | "SPEECH" | "MINUTES" | "PRESS_CONFERENCE" | "INTERVENTION";
  currency: string;
  scheduled_at: string;
  expected_value?: string | null;
  actual_value?: string | null;
  outcome_tone?: CentralBankTone | null;
  source?: string | null;
}

export interface UpdateCentralBankEventInput {
  bank_code?: string;
  bank_name?: string;
  title?: string;
  event_type?: "RATE_DECISION" | "SPEECH" | "MINUTES" | "PRESS_CONFERENCE" | "INTERVENTION";
  currency?: string;
  scheduled_at?: string;
  expected_value?: string | null;
  actual_value?: string | null;
  outcome_tone?: CentralBankTone | null;
  source?: string | null;
}
