import { getDb } from "../../config/database";
import { SUPPORTED_CURRENCIES, MAJOR_PAIRS } from "../../config/constants";

const CURRENCY_NAMES: Record<string, { name: string; symbol: string; country: string }> = {
  USD: { name: "US Dollar", symbol: "$", country: "United States" },
  EUR: { name: "Euro", symbol: "€", country: "Eurozone" },
  GBP: { name: "British Pound", symbol: "£", country: "United Kingdom" },
  JPY: { name: "Japanese Yen", symbol: "¥", country: "Japan" },
  CHF: { name: "Swiss Franc", symbol: "Fr", country: "Switzerland" },
  AUD: { name: "Australian Dollar", symbol: "A$", country: "Australia" },
  CAD: { name: "Canadian Dollar", symbol: "C$", country: "Canada" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$", country: "New Zealand" },
  SGD: { name: "Singapore Dollar", symbol: "S$", country: "Singapore" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$", country: "Hong Kong" },
  SEK: { name: "Swedish Krona", symbol: "kr", country: "Sweden" },
  NOK: { name: "Norwegian Krone", symbol: "kr", country: "Norway" },
  DKK: { name: "Danish Krone", symbol: "kr", country: "Denmark" },
  ZAR: { name: "South African Rand", symbol: "R", country: "South Africa" },
  MXN: { name: "Mexican Peso", symbol: "$", country: "Mexico" },
  BRL: { name: "Brazilian Real", symbol: "R$", country: "Brazil" },
};

function futureDate(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function pastDate(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function readCount(statement: { get: () => unknown }): number {
  const row = statement.get() as { total?: number } | undefined;
  return row?.total ?? 0;
}

export function runSeeds(): void {
  const db = getDb();

  const insertCurrency = db.prepare(`
    INSERT OR IGNORE INTO currencies (code, name, symbol, country)
    VALUES (@code, @name, @symbol, @country)
  `);

  const insertPair = db.prepare(`
    INSERT OR IGNORE INTO currency_pairs (base_currency, quote_currency, pair_symbol, is_major)
    VALUES (@base, @quote, @pair, @isMajor)
  `);

  const getEconomicEventsCount = db.prepare("SELECT COUNT(*) as total FROM economic_events");

  const getSignalsCount = db.prepare("SELECT COUNT(*) as total FROM signals");

  const getTradeSetupsCount = db.prepare("SELECT COUNT(*) as total FROM trade_setups");
  const getMacroIndicatorsCount = db.prepare("SELECT COUNT(*) as total FROM macro_indicators");
  const getCentralBankEventsCount = db.prepare("SELECT COUNT(*) as total FROM central_bank_events");
  const getCurrencyBiasSnapshotsCount = db.prepare("SELECT COUNT(*) as total FROM currency_bias_snapshots");

  const insertEconomicEvent = db.prepare(`
    INSERT INTO economic_events (
      title,
      currency,
      impact,
      scheduled_at,
      actual_value,
      forecast_value,
      previous_value,
      source
    ) VALUES (
      @title,
      @currency,
      @impact,
      @scheduledAt,
      @actualValue,
      @forecastValue,
      @previousValue,
      @source
    )
  `);

  const insertSignal = db.prepare(`
    INSERT INTO signals (
      pair_symbol,
      signal_type,
      timeframe,
      strength,
      reasoning,
      generated_at,
      expires_at,
      is_active
    ) VALUES (
      @pairSymbol,
      @signalType,
      @timeframe,
      @strength,
      @reasoning,
      @generatedAt,
      @expiresAt,
      @isActive
    )
  `);

  const insertTradeSetup = db.prepare(`
    INSERT INTO trade_setups (
      signal_id,
      pair_symbol,
      entry_price,
      stop_loss,
      take_profit_1,
      take_profit_2,
      take_profit_3,
      risk_reward_ratio,
      lot_size_suggestion,
      notes,
      status
    ) VALUES (
      @signalId,
      @pairSymbol,
      @entryPrice,
      @stopLoss,
      @takeProfit1,
      @takeProfit2,
      @takeProfit3,
      @riskRewardRatio,
      @lotSizeSuggestion,
      @notes,
      @status
    )
  `);

  const insertMacroIndicator = db.prepare(`
    INSERT INTO macro_indicators (
      indicator_code,
      indicator_name,
      currency,
      value,
      previous_value,
      forecast_value,
      unit,
      importance,
      signal_direction,
      period,
      released_at,
      source
    ) VALUES (
      @indicatorCode,
      @indicatorName,
      @currency,
      @value,
      @previousValue,
      @forecastValue,
      @unit,
      @importance,
      @signalDirection,
      @period,
      @releasedAt,
      @source
    )
  `);

  const insertCentralBankEvent = db.prepare(`
    INSERT INTO central_bank_events (
      bank_code,
      bank_name,
      title,
      event_type,
      currency,
      scheduled_at,
      expected_value,
      actual_value,
      outcome_tone,
      source
    ) VALUES (
      @bankCode,
      @bankName,
      @title,
      @eventType,
      @currency,
      @scheduledAt,
      @expectedValue,
      @actualValue,
      @outcomeTone,
      @source
    )
  `);

  const insertCurrencyBiasSnapshot = db.prepare(`
    INSERT INTO currency_bias_snapshots (
      currency,
      score,
      bias,
      confidence,
      drivers,
      computed_at
    ) VALUES (
      @currency,
      @score,
      @bias,
      @confidence,
      @drivers,
      @computedAt
    )
  `);

  const seedAll = db.transaction(() => {
    for (const code of SUPPORTED_CURRENCIES) {
      const info = CURRENCY_NAMES[code];
      if (info) insertCurrency.run({ code, ...info });
    }

    for (const pair of MAJOR_PAIRS) {
      const [base, quote] = pair.split("/");
      insertPair.run({ base, quote, pair, isMajor: 1 });
    }

    if (readCount(getEconomicEventsCount) === 0) {
      const events = [
        {
          title: "US Non-Farm Payrolls",
          currency: "USD",
          impact: "HIGH",
          scheduledAt: futureDate(24),
          actualValue: null,
          forecastValue: "190K",
          previousValue: "172K",
          source: "Manual Seed",
        },
        {
          title: "ECB Interest Rate Decision",
          currency: "EUR",
          impact: "HIGH",
          scheduledAt: futureDate(48),
          actualValue: null,
          forecastValue: "4.25%",
          previousValue: "4.25%",
          source: "Manual Seed",
        },
        {
          title: "UK CPI y/y",
          currency: "GBP",
          impact: "MEDIUM",
          scheduledAt: futureDate(18),
          actualValue: null,
          forecastValue: "3.2%",
          previousValue: "3.5%",
          source: "Manual Seed",
        },
      ];

      for (const event of events) {
        insertEconomicEvent.run(event);
      }
    }

    if (readCount(getSignalsCount) === 0) {
      const signals = [
        {
          pairSymbol: "EUR/USD",
          signalType: "BUY",
          timeframe: "4h",
          strength: 0.78,
          reasoning: "Bullish momentum after support retest and softer USD tone.",
          generatedAt: pastDate(2),
          expiresAt: futureDate(10),
          isActive: 1,
        },
        {
          pairSymbol: "GBP/USD",
          signalType: "NEUTRAL",
          timeframe: "1h",
          strength: 0.52,
          reasoning: "Price consolidating ahead of CPI release.",
          generatedAt: pastDate(1),
          expiresAt: futureDate(6),
          isActive: 1,
        },
        {
          pairSymbol: "USD/JPY",
          signalType: "SELL",
          timeframe: "1d",
          strength: 0.74,
          reasoning: "Rejection near resistance with fading trend strength.",
          generatedAt: pastDate(5),
          expiresAt: futureDate(20),
          isActive: 1,
        },
      ];

      for (const signal of signals) {
        insertSignal.run(signal);
      }
    }

    if (readCount(getTradeSetupsCount) === 0) {
      const signalRows = db
        .prepare("SELECT id, pair_symbol FROM signals WHERE is_active = 1 ORDER BY id ASC")
        .all() as Array<{ id: number; pair_symbol: string }>;

      const signalIdByPair = new Map(signalRows.map((row) => [row.pair_symbol, row.id]));

      const setups = [
        {
          signalId: signalIdByPair.get("EUR/USD") ?? null,
          pairSymbol: "EUR/USD",
          entryPrice: 1.0842,
          stopLoss: 1.0798,
          takeProfit1: 1.0895,
          takeProfit2: 1.092,
          takeProfit3: 1.0965,
          riskRewardRatio: 2.8,
          lotSizeSuggestion: 0.3,
          notes: "Scale partials at TP1 and trail remainder below 4H swing low.",
          status: "ACTIVE",
        },
        {
          signalId: signalIdByPair.get("USD/JPY") ?? null,
          pairSymbol: "USD/JPY",
          entryPrice: 154.8,
          stopLoss: 155.45,
          takeProfit1: 153.95,
          takeProfit2: 153.4,
          takeProfit3: null,
          riskRewardRatio: 2.15,
          lotSizeSuggestion: 0.2,
          notes: "Watch for intervention headlines before holding overnight.",
          status: "PENDING",
        },
      ];

      for (const setup of setups) {
        insertTradeSetup.run(setup);
      }
    }

    if (readCount(getMacroIndicatorsCount) === 0) {
      const indicators = [
        {
          indicatorCode: "US_CPI_YOY",
          indicatorName: "US CPI YoY",
          currency: "USD",
          value: 3.1,
          previousValue: 3.2,
          forecastValue: 3.2,
          unit: "%",
          importance: "HIGH",
          signalDirection: "LOWER_IS_BULLISH",
          period: "2026-03",
          releasedAt: pastDate(6),
          source: "Manual Seed",
        },
        {
          indicatorCode: "US_NFP",
          indicatorName: "US Non-Farm Payrolls",
          currency: "USD",
          value: 218,
          previousValue: 179,
          forecastValue: 190,
          unit: "K",
          importance: "HIGH",
          signalDirection: "HIGHER_IS_BULLISH",
          period: "2026-03",
          releasedAt: pastDate(2),
          source: "Manual Seed",
        },
        {
          indicatorCode: "EU_PMI_COMPOSITE",
          indicatorName: "Eurozone Composite PMI",
          currency: "EUR",
          value: 49.2,
          previousValue: 48.7,
          forecastValue: 49,
          unit: "index",
          importance: "MEDIUM",
          signalDirection: "HIGHER_IS_BULLISH",
          period: "2026-03",
          releasedAt: pastDate(10),
          source: "Manual Seed",
        },
      ];

      for (const indicator of indicators) {
        insertMacroIndicator.run(indicator);
      }
    }

    if (readCount(getCentralBankEventsCount) === 0) {
      const bankEvents = [
        {
          bankCode: "FED",
          bankName: "Federal Reserve",
          title: "FOMC Rate Decision",
          eventType: "RATE_DECISION",
          currency: "USD",
          scheduledAt: futureDate(30),
          expectedValue: "5.25%",
          actualValue: null,
          outcomeTone: "NEUTRAL",
          source: "Manual Seed",
        },
        {
          bankCode: "ECB",
          bankName: "European Central Bank",
          title: "ECB Press Conference",
          eventType: "PRESS_CONFERENCE",
          currency: "EUR",
          scheduledAt: futureDate(20),
          expectedValue: null,
          actualValue: null,
          outcomeTone: "NEUTRAL",
          source: "Manual Seed",
        },
      ];

      for (const bankEvent of bankEvents) {
        insertCentralBankEvent.run(bankEvent);
      }
    }

    if (readCount(getCurrencyBiasSnapshotsCount) === 0) {
      const biasRows = [
        {
          currency: "USD",
          score: 0.71,
          bias: "BULLISH",
          confidence: 0.76,
          drivers: "Strong labor data and resilient yields",
          computedAt: new Date().toISOString(),
        },
        {
          currency: "EUR",
          score: -0.18,
          bias: "BEARISH",
          confidence: 0.62,
          drivers: "Soft growth momentum and cautious ECB tone",
          computedAt: new Date().toISOString(),
        },
        {
          currency: "JPY",
          score: -0.08,
          bias: "NEUTRAL",
          confidence: 0.55,
          drivers: "Mixed policy expectations with intervention risk",
          computedAt: new Date().toISOString(),
        },
      ];

      for (const row of biasRows) {
        insertCurrencyBiasSnapshot.run(row);
      }
    }
  });

  seedAll();
  console.log("Seeds ran successfully.");
}
