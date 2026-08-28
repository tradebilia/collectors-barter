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
    expect(carouselSource).toContain("formatConditionOrGrade");
    expect(carouselSource).toContain("item.certificationCompany?.trim()");
    expect(carouselSource).toContain("${gradingCompany} ${formattedGrade}");
    expect(carouselSource).toContain("Grade ${formattedGrade}");
    expect(carouselSource).toContain("Condition: ${condition.replaceAll");
    expect(carouselSource).toContain("text-[2.45rem]");
    expect(carouselSource).toContain('alignment="end"');
    expect(carouselSource).toContain('alignment="start"');
    expect(carouselSource).toContain('className="h-24 w-24');
    expect(carouselSource).toContain("text-violet-700");
    expect(routerSource).toContain("l.condition as requestedListingCondition");
    expect(routerSource).toContain("l.grade as requestedListingGrade");
    expect(routerSource).toContain("l.certificationCompany as requestedListingCertificationCompany");
    expect(routerSource).toContain("ol.condition, ol.grade, ol.certificationCompany, ol.estimatedValue");
    expect(carouselSource).toContain('className="h-10 w-10 text-violet-600"');
    expect(carouselSource).not.toContain("Tradebilia exchange activity");
    expect(carouselSource).not.toContain("Completed trade");
    expect(carouselSource).not.toContain("Previous");
    expect(carouselSource).not.toContain("Next");
  });
});
