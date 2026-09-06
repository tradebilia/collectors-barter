import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const routerSource = readFileSync(join(projectRoot, "server", "tradeFlowRouter.ts"), "utf8");
const hubSource = readFileSync(join(projectRoot, "client", "src", "pages", "TradeHub.tsx"), "utf8");

describe("Trade Hub completed exchange preview", () => {
  it("returns the requested and offered items as a direction-aware completed exchange", () => {
    expect(routerSource).toContain("completedExchange");
    expect(routerSource).toContain("buildCompletedTradeExchange(trade.direction, requestedItem, offeredItems)");
    expect(routerSource).toContain("JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id");
  });

  it("renders actual received and sent item groups instead of the original requested-item preview", () => {
    expect(hubSource).toContain("CompletedExchangePreview");
    expect(hubSource).toContain("You received");
    expect(hubSource).toContain("You sent");
    expect(hubSource).toContain("selectedTrade.completedExchange");
    expect(hubSource).not.toContain("Items actually swapped");
    expect(hubSource).toContain("Mutual Exchange");
    expect(hubSource).toContain("completedItemCount");
    expect(routerSource).toContain("oup.avatarUrl as otherAvatarUrl");
    expect(routerSource).toContain("paymentRows");
    expect(routerSource).toContain("paymentMethod: payment.paymentMethod");
    expect(hubSource).toContain("Cash exchanged");
    expect(hubSource).toContain("navigate(`/profile/${selectedTrade.otherUser.id}`)");
    expect(hubSource).not.toContain("; {filteredTrades.length}");
    expect(hubSource).toContain("inline-flex h-6 min-w-7 items-center justify-center");
    expect(hubSource).toContain("bg-white px-4 py-2 text-gray-900");
    expect(hubSource).toContain("from-blue-600 to-cyan-500");
    expect(hubSource).toContain("activeFolder === \"completed\"");
  });
});
