import { describe, expect, it } from "vitest";
import { computeMetrics, normalizeValuationEvidence } from "./testAIRouter";

describe("valuation evidence normalization", () => {
  const sale = (overrides: Record<string, unknown> = {}) => ({
    title: "Example collectible",
    marketplace: "eBay",
    date: "2026-08-01",
    price: { value: "100", currency: "USD" },
    ...overrides,
  });

  it("excludes non-USD evidence until an approved conversion source is available", () => {
    expect(normalizeValuationEvidence([sale(), sale({ price: { value: "90", currency: "EUR" } })])).toHaveLength(1);
  });

  it("keeps one copy of repeated sales before calculating summary metrics", () => {
    const rows = [sale({ saleId: "abc" }), sale({ saleId: "abc" }), sale({ saleId: "def", price: { value: "200", currency: "USD" } })];
    expect(normalizeValuationEvidence(rows)).toHaveLength(2);
    expect(computeMetrics(rows)?.count).toBe(2);
  });
});
