import { describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { buildTnnVideoInstruction, createTradeVideoTask } from "./manusVideoGeneration";

describe("Manus API configuration", () => {
  it("authenticates the configured server-side API key with the read-only user endpoint", async () => {
    expect(ENV.manusApiKey, "MANUS_API_KEY must be configured for this integration test").toBeTruthy();
    const response = await fetch("https://api.manus.ai/v2/user.me", {
      headers: { "x-manus-api-key": ENV.manusApiKey },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => null) as { ok?: boolean; error?: { message?: string } } | null;
    expect(response.ok, body?.error?.message || `Manus user.me returned HTTP ${response.status}`).toBe(true);
    expect(body?.ok).toBe(true);
  });

  it("uses documented file content parts for trade-item image references", async () => {
    const response = {
      ok: true,
      json: async () => ({ ok: true, task_id: "task_test", task_url: "https://manus.im/app/task_test" }),
    } as Response;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
    try {
      await createTradeVideoTask({
        script: "Breaking News from Tradebilia. TNN reports a completed collector trade. Where collectors connect.",
        durationSeconds: 30,
        anchorMode: "sidney",
        sellerName: "Jordan",
        buyerName: "Alex",
        cashOnly: false,
        selectedItems: [{ title: "Test collectible", facts: [{ label: "Year", value: "1986" }] }],
        additionalItemsCount: 0,
        tickerText: "Where collectors connect.",
        logoUrl: "https://tradebilia.manus.space/manus-storage/TNNlogo_da53263e.png",
        imageUrls: ["https://tradebilia.manus.space/item.jpg"],
        generationAttempt: 1,
      });
      const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
      expect(body.message.content[1]).toMatchObject({ type: "file", file_url: "https://tradebilia.manus.space/manus-storage/TNNlogo_da53263e.png", filename: "tnn-tradebilia-news-network-logo.png", mime_type: "image/png" });
      expect(body.message.content[2]).toMatchObject({ type: "file", file_url: "https://tradebilia.manus.space/item.jpg", mime_type: "image/jpeg" });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("writes the approved privacy-safe TNN newsroom contract into the anchor instruction", () => {
    const instruction = buildTnnVideoInstruction({
      script: "Breaking News from Tradebilia. TNN reports Seller Smith and Buyer Jones completed a collector trade. Where collectors connect.",
      durationSeconds: 45,
      anchorMode: "duo",
      sellerName: "Seller Smith",
      buyerName: "Buyer Jones",
      cashOnly: false,
      selectedItems: [{ title: "Test collectible", grade: "9", certificationCompany: "PSA" }],
      additionalItemsCount: 1,
      tickerText: "Where collectors connect.",
      logoUrl: "https://tradebilia.manus.space/manus-storage/TNNlogo_da53263e.png",
      imageUrls: ["https://tradebilia.manus.space/item.jpg"],
      generationAttempt: 1,
    });
    expect(instruction).toContain("45-second, 16:9 Tradebilia News Network");
    expect(instruction).toContain("Max Tradebloski and Sidney Tradewell");
    expect(instruction).toContain("picture-in-picture panel in the upper corner");
    expect(instruction).toContain("headline strap reading 'BREAKING NEWS FROM TRADEBILIA'");
    expect(instruction).toContain("attached, supplied dedicated TNN (Tradebilia News Network) logo");
    expect(instruction).toContain("do not substitute a generic Tradebilia wordmark");
    expect(instruction).toContain("TNNlogo_da53263e.png");
    expect(instruction).toContain("Do not place participant names, item values, prices, cash amounts");
    expect(instruction).toContain("names are allowed in the spoken script only; never render them as text");
    expect(instruction).toContain("Where collectors connect.");
  });
});
