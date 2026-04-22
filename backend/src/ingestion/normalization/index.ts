// Normalize raw incoming data into the platform's standard shape before DB insert.
// Will be expanded per data source in Stage 2.

export function normalizePrice(raw: unknown): number {
  const n = Number(raw);
  if (isNaN(n)) throw new Error(`Cannot normalize price: "${raw}"`);
  return n;
}

export function normalizeImpact(raw: string): "LOW" | "MEDIUM" | "HIGH" {
  const upper = raw.toUpperCase();
  if (upper === "LOW" || upper === "MEDIUM" || upper === "HIGH") return upper;
  throw new Error(`Unknown impact level: "${raw}"`);
}
