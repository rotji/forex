export interface ExternalMacroIndicatorInput {
	indicatorCode: string;
	indicatorName: string;
	currency: string;
	value: number | null;
	previousValue: number | null;
	forecastValue: number | null;
	unit: string | null;
	importance: "LOW" | "MEDIUM" | "HIGH";
	signalDirection: "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH";
	period: string | null;
	releasedAt: string;
	source: string;
	sourceProvider: string;
	sourceId: string;
}

export interface ExternalCentralBankEventInput {
	bankCode: string;
	bankName: string;
	title: string;
	eventType: "RATE_DECISION" | "SPEECH" | "MINUTES" | "PRESS_CONFERENCE" | "INTERVENTION";
	currency: string;
	scheduledAt: string;
	expectedValue: string | null;
	actualValue: string | null;
	outcomeTone: "DOVISH" | "NEUTRAL" | "HAWKISH" | null;
	source: string;
	sourceProvider: string;
	sourceId: string;
}

export interface IngestionPayload {
	provider: string;
	fetchedAt: string;
	macroIndicators: ExternalMacroIndicatorInput[];
	centralBankEvents: ExternalCentralBankEventInput[];
}

function buildMockIngestionPayload(): IngestionPayload {
	const fetchedAt = new Date().toISOString();
	return {
		provider: "mock-provider",
		fetchedAt,
		macroIndicators: [
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
				releasedAt: fetchedAt,
				source: "Mock Ingestion",
				sourceProvider: "mock-provider",
				sourceId: "macro-us-cpi-yoy-2026-03",
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
				releasedAt: fetchedAt,
				source: "Mock Ingestion",
				sourceProvider: "mock-provider",
				sourceId: "macro-eu-pmi-composite-2026-03",
			},
		],
		centralBankEvents: [
			{
				bankCode: "FED",
				bankName: "Federal Reserve",
				title: "FOMC Rate Decision",
				eventType: "RATE_DECISION",
				currency: "USD",
				scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				expectedValue: "5.25%",
				actualValue: null,
				outcomeTone: "NEUTRAL",
				source: "Mock Ingestion",
				sourceProvider: "mock-provider",
				sourceId: "cb-fed-rate-decision-next",
			},
		],
	};
}

export async function fetchIngestionPayloadFromProviders(): Promise<IngestionPayload> {
	if (process.env.INGESTION_MOCK_FAIL === "1") {
		throw new Error("Forced ingestion provider failure");
	}
	// Adapter scaffold. Replace this with real provider clients in production.
	return buildMockIngestionPayload();
}
