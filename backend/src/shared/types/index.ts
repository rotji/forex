export type SignalType = "BUY" | "SELL" | "NEUTRAL";
export type ImpactLevel = "LOW" | "MEDIUM" | "HIGH";
export type TradeStatus = "PENDING" | "ACTIVE" | "HIT_TP" | "HIT_SL" | "CANCELLED";
export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

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
