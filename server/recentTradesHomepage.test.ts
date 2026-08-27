import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

describe("homepage Recent Trades carousel", () => {
  it("uses the ten newest completed trades and preserves complete exchanged-item data", async () => {
    const [homeSource, routerSource, carouselSource] = await Promise.all([
      readFile(path.join(root, "client/src/pages/Home.tsx"), "utf8"),
      readFile(path.join(root, "server/routers.ts"), "utf8"),
      readFile(path.join(root, "client/src/components/RecentTradesCarousel.tsx"), "utf8"),
    ]);
    expect(homeSource).toContain('getCompletedTrades.useQuery({ limit: 10, offset: 0, sortBy: "recent" }');
    expect(homeSource).toContain("<RecentTradesCarousel");
    expect(routerSource).toContain("Return every offered item for each completed exchange");
    expect(routerSource).not.toContain("WHERE tpi.proposalId = ${trade.id}\n            LIMIT 4");
    expect(carouselSource).toContain("ROTATION_INTERVAL_MS = 5_000");
    expect(carouselSource).toContain("requestAnimationFrame");
    expect(carouselSource).toContain("prefers-reduced-motion: reduce");
    expect(carouselSource).toContain("buildTradeShowcaseExchange");
    expect(carouselSource).toContain("formatEstimatedValue");
    expect(carouselSource).not.toContain("Previous");
    expect(carouselSource).not.toContain("Next");
  });
});
