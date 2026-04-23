import { api } from "./api";
import type { MacroIndicator, CreateMacroIndicatorInput, UpdateMacroIndicatorInput } from "../types";

export const macroIndicatorsService = {
  getLatest: () => api.get<MacroIndicator[]>("/macro-indicators"),
  getByCurrency: (code: string) => api.get<MacroIndicator[]>(`/macro-indicators/currency/${code}`),
  create: (input: CreateMacroIndicatorInput) => api.post<MacroIndicator>("/macro-indicators", input),
  update: (id: number, input: UpdateMacroIndicatorInput) => api.put<MacroIndicator>(`/macro-indicators/${id}`, input),
  remove: (id: number) => api.del(`/macro-indicators/${id}`),
};
