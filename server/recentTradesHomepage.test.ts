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
    expect(homeSource).toContain("<RecentlyAddedCarousel");
    expect(homeSource).not.toContain("{marketplaceQuery.isLoading ? (");
    expect(homeSource).toContain("isLoading={recentTradesQuery.isLoading}");
    expect(routerSource).toContain("Return every offered item for each completed exchange");
    expect(routerSource).not.toContain("WHERE tpi.proposalId = ${trade.id}\n            LIMIT 4");
    expect(carouselSource).toContain("ROTATION_INTERVAL_MS = 5_000");
    expect(carouselSource).toContain("requestAnimationFrame");
    expect(carouselSource).toContain("prefers-reduced-motion: reduce");
    expect(carouselSource).toContain("buildTradeShowcaseExchange");
    expect(carouselSource).toContain("getMemberName");
    expect(carouselSource).toContain("ticket-card");
    expect(carouselSource).toContain("border-dashed");
    expect(carouselSource).toContain("TicketDivider");
    expect(carouselSource).toContain("object-contain p-0.5");
    expect(carouselSource).toContain("h-24 w-24");
    expect(carouselSource).toContain("bg-[#f1f7ef]");
    expect(carouselSource).toContain("bg-[#e1efdc]");
    expect(carouselSource).toContain("formatEstimatedValue");
    expect(carouselSource).toContain("formatConditionOrGrade");
    expect(carouselSource).toContain("item.certificationCompany?.trim()");
    expect(carouselSource).toContain("${gradingCompany} ${formattedGrade}");
    expect(carouselSource).toContain("Grade ${formattedGrade}");
    expect(carouselSource).toContain("Condition: ${condition.replaceAll");
    expect(carouselSource).toContain("text-[2.45rem]");
    expect(carouselSource).toContain('<TradeMember member={exchange.left.member} />');
    expect(carouselSource).toContain('<TradeMember member={exchange.right.member} />');
    expect(carouselSource).toContain("<ArrowLeft");
    expect(carouselSource).toContain("<ArrowRight");
    expect(carouselSource).toContain('src="/manus-storage/trade-complete-stamp_e8860371.png"');
    expect(carouselSource).toContain('alt="Trade complete"');
    expect(carouselSource).toContain('className="h-28 w-32');
    expect(carouselSource).toContain("verificationLabels");
    expect(carouselSource).toContain("averageRating");
    expect(carouselSource).not.toContain('title="You gave"');
    expect(carouselSource).not.toContain('title="You received"');
    expect(carouselSource).toContain("Trade ID:");
    expect(carouselSource).toContain("Total Trade Value:");
    expect(carouselSource).toContain("Verified trade");
    expect(carouselSource).toContain("formatTradeDate");
    expect(carouselSource).toContain("text-violet-700");
    expect(routerSource).toContain("l.condition as requestedListingCondition");
    expect(routerSource).toContain("l.grade as requestedListingGrade");
    expect(routerSource).toContain("l.certificationCompany as requestedListingCertificationCompany");
    expect(routerSource).toContain("req_u.username as requesterUsername");
    expect(routerSource).toContain("rec_u.username as recipientUsername");
    expect(routerSource).toContain("AVG(overallRating)");
    expect(routerSource).toContain("requesterEbayVerified");
    expect(routerSource).toContain("requesterMerchantVerified");
    expect(routerSource).toContain("ol.condition, ol.grade, ol.certificationCompany, ol.estimatedValue");
    expect(carouselSource).not.toContain("Tradebilia exchange activity");
    expect(carouselSource).not.toContain("Completed trade");
    expect(carouselSource).toContain("Previous recent trade");
    expect(carouselSource).toContain("Next recent trade");
  });
});
