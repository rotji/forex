import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { CurrenciesPage } from "./pages/CurrenciesPage";
import { PairsPage } from "./pages/PairsPage";
import { EventsPage } from "./pages/EventsPage";
import { SignalsPage } from "./pages/SignalsPage";
import { SetupsPage } from "./pages/SetupsPage";
import { MacroIndicatorsPage } from "./pages/MacroIndicatorsPage";
import { CentralBankEventsPage } from "./pages/CentralBankEventsPage";
import { RiskSentimentPage } from "./pages/RiskSentimentPage";
import { PositioningPage } from "./pages/PositioningPage";
import { CurrencyBiasPage } from "./pages/CurrencyBiasPage";
import { AlertsPage } from "./pages/AlertsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="currencies" element={<CurrenciesPage />} />
          <Route path="pairs" element={<PairsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="signals" element={<SignalsPage />} />
          <Route path="setups" element={<SetupsPage />} />
          <Route path="macro-indicators" element={<MacroIndicatorsPage />} />
          <Route path="central-bank-events" element={<CentralBankEventsPage />} />
          <Route path="risk-sentiment" element={<RiskSentimentPage />} />
          <Route path="positioning" element={<PositioningPage />} />
          <Route path="currency-bias" element={<CurrencyBiasPage />} />
          <Route path="alerts" element={<AlertsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
