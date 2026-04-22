import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { CurrenciesPage } from "./pages/CurrenciesPage";
import { PairsPage } from "./pages/PairsPage";
import { EventsPage } from "./pages/EventsPage";
import { SignalsPage } from "./pages/SignalsPage";
import { SetupsPage } from "./pages/SetupsPage";

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
