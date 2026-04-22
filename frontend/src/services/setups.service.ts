import { api } from "./api";
import type { TradeSetup } from "../types";

export const setupsService = {
  getActive: () => api.get<TradeSetup[]>("/setups"),
  getByPair: (pair: string) => api.get<TradeSetup[]>(`/setups/${pair}`),
};
