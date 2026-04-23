import { API_BASE_URL } from "../constants";
import type { CsvImportDataset, CsvImportResponse } from "../types";

async function importCsv(dataset: CsvImportDataset, file: File): Promise<CsvImportResponse> {
  const formData = new FormData();
  formData.append("dataset", dataset);
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/data-import/csv`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<CsvImportResponse>;
}

export const dataImportService = {
  importCsv,
};
