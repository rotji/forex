import { api } from "./api";
import type { Signal } from "../types";

export const signalsService = {
  getActive: () => api.get<Signal[]>("/signals"),
  getByPair: (pair: string) => api.get<Signal[]>(`/signals/${pair}`),
};
