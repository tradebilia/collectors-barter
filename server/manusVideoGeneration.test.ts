import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { buildTnnVideoInstruction, createTradeVideoTask } from "./manusVideoGeneration";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

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
        script: "Breaking News from Tradebilia. I'm Sidney Tradewell with the TNN Network. Jordan and Alex completed a collector trade featuring Test collectible. Tradebilia.",
        durationSeconds: 45,
        anchorMode: "sidney",
        sellerName: "Jordan",
        buyerName: "Alex",
        cashOnly: false,
        selectedItems: [{ title: "Test collectible", facts: [{ label: "Year", value: "1986" }] }],
        additionalItemsCount: 0,
        tickerText: "www.Tradebilia.com",
        logoUrl: "https://tradebilia.manus.space/manus-storage/GlossyTNNTradebiliaNewsLogo_2c671156.png",
        newsroomReferenceUrl: "https://tradebilia.manus.space/manus-storage/TNNTradebiliaNewsroomStudio_7f73bd45.png",
        openingReferenceUrl: "https://tradebilia.manus.space/manus-storage/TNNOpeningGlobeReference_f90474c7.png",
        imageUrls: ["https://tradebilia.manus.space/item.jpg"],
        generationAttempt: 1,
      });
      const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
      expect(body.message.content[1]).toMatchObject({ type: "file", file_url: "https://tradebilia.manus.space/manus-storage/GlossyTNNTradebiliaNewsLogo_2c671156.png", filename: "tnn-tradebilia-news-network-logo.png", mime_type: "image/png" });
      expect(body.message.content[2]).toMatchObject({ type: "file", file_url: "https://tradebilia.manus.space/manus-storage/TNNTradebiliaNewsroomStudio_7f73bd45.png", filename: "tnn-approved-newsroom-set-reference.png", mime_type: "image/png" });
      expect(body.message.content[3]).toMatchObject({ type: "file", file_url: "https://tradebilia.manus.space/manus-storage/TNNOpeningGlobeReference_f90474c7.png", filename: "tnn-approved-opening-globe-reference.png", mime_type: "image/png" });
      expect(body.message.content[4]).toMatchObject({ type: "file", file_url: "https://tradebilia.manus.space/item.jpg", mime_type: "image/jpeg" });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("writes the approved privacy-safe TNN newsroom contract into the anchor instruction", () => {
    const instruction = buildTnnVideoInstruction({
      script: "Breaking News from Tradebilia. I'm Max Tradebloski with the TNN Network. Seller Smith and Buyer Jones completed a collector trade featuring Test collectible. This completed exchange celebrates collecting with care and shared enthusiasm across the community. Every selected piece is presented as part of the completed transaction. The report keeps the focus on the collector story, accurate item context, and the people behind the exchange. Tradebilia.",
      durationSeconds: 45,
      anchorMode: "duo",
      sellerName: "Seller Smith",
      buyerName: "Buyer Jones",
      cashOnly: false,
      selectedItems: [{ title: "Test collectible", grade: "9", certificationCompany: "PSA" }],
      additionalItemsCount: 1,
      tickerText: "www.Tradebilia.com",
      logoUrl: "https://tradebilia.manus.space/manus-storage/GlossyTNNTradebiliaNewsLogo_2c671156.png",
      newsroomReferenceUrl: "https://tradebilia.manus.space/manus-storage/TNNTradebiliaNewsroomStudio_7f73bd45.png",
      openingReferenceUrl: "https://tradebilia.manus.space/manus-storage/TNNOpeningGlobeReference_f90474c7.png",
      imageUrls: ["https://tradebilia.manus.space/item.jpg"],
      generationAttempt: 1,
    });
    expect(instruction).toContain("45-second, 16:9 Tradebilia News Network");
    expect(instruction).toContain("Max Tradebloski and Sidney Tradewell");
    expect(instruction).toContain("picture-in-picture panel in the upper-right corner");
    expect(instruction).toContain("BREAKING NEWS FROM TRADEBILIA");
    expect(instruction).toContain("transparent glossy TNN (Tradebilia News Network) mark");
    expect(instruction).toContain("upper-left or upper-corner logo");
    expect(instruction).toContain("GlossyTNNTradebiliaNewsLogo_2c671156.png");
    expect(instruction).toContain("Approved newsroom visual reference");
    expect(instruction).toContain("clean white and ice-gray studio");
    expect(instruction).toContain("glossy curved white-and-navy anchor desk");
    expect(instruction).toContain("TNNTradebiliaNewsroomStudio_7f73bd45.png");
    expect(instruction).toContain("TNNOpeningGlobeReference_f90474c7.png");
    expect(instruction).toContain("never as a square, rectangular, flat, or pasted logo card");
    expect(instruction).toContain("attached approved TNN newsroom visual-reference image");
    expect(instruction).toContain("stable polished medium desk shot");
    expect(instruction).toContain("Do not place participant names, item values, prices, cash amounts");
    expect(instruction).toContain("names are allowed in the spoken script only; never render them as text");
    expect(instruction).toContain("www.Tradebilia.com");
    expect(instruction).toContain("trade-bil-lee-uh");
    expect(instruction).toContain("the TNN Network");
  });

  it("keeps the approved TNN logo and newsroom reference server-owned", () => {
    const videoProcedure = routerSource.slice(routerSource.indexOf("startCompletedTradeVideoGeneration:"), routerSource.indexOf("getCompletedTradeVideoGeneration:"));
    expect(videoProcedure).toContain('logoUrl: TNN_VIDEO_LOGO_URL');
    expect(videoProcedure).toContain('newsroomReferenceUrl: TNN_NEWSROOM_REFERENCE_URL');
    expect(videoProcedure).toContain('openingReferenceUrl: TNN_OPENING_REFERENCE_URL');
    expect(videoProcedure).not.toContain('logoUrl: z.string()');
    expect(videoProcedure).not.toContain('newsroomReferenceUrl: z.string()');
    expect(videoProcedure).not.toContain('openingReferenceUrl: z.string()');
  });
});
