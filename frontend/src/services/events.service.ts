import { api } from "./api";
import type { EconomicEvent } from "../types";

export const eventsService = {
  getUpcoming: () => api.get<EconomicEvent[]>("/events"),
  getHighImpact: () => api.get<EconomicEvent[]>("/events/high-impact"),
  getByCurrency: (code: string) => api.get<EconomicEvent[]>(`/events/currency/${code}`),
};
