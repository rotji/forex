import { api } from "./api";
import type { MacroIndicator } from "../types";

export const macroIndicatorsService = {
  getLatest: () => api.get<MacroIndicator[]>("/macro-indicators"),
  getByCurrency: (code: string) => api.get<MacroIndicator[]>(`/macro-indicators/currency/${code}`),
};
