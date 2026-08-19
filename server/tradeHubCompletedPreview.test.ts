import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const routerSource = readFileSync(join(projectRoot, "server", "tradeFlowRouter.ts"), "utf8");
const hubSource = readFileSync(join(projectRoot, "client", "src", "pages", "TradeHub.tsx"), "utf8");

describe("Trade Hub completed exchange preview", () => {
  it("returns the requested and offered items as a direction-aware completed exchange", () => {
    expect(routerSource).toContain("completedExchange");
    expect(routerSource).toContain("received: requestedItem, sent: offeredItems");
    expect(routerSource).toContain("received: offeredItems, sent: requestedItem");
    expect(routerSource).toContain("JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id");
  });

  it("renders actual received and sent item groups instead of the original requested-item preview", () => {
    expect(hubSource).toContain("CompletedExchangePreview");
    expect(hubSource).toContain("Items actually swapped");
    expect(hubSource).toContain("You received");
    expect(hubSource).toContain("You sent");
    expect(hubSource).toContain("selectedTrade.completedExchange");
  });
});
