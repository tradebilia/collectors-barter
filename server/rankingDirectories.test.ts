import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const dbSource = readFileSync(resolve(projectRoot, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
const rankingPageSource = readFileSync(resolve(projectRoot, "client/src/pages/RankingPages.tsx"), "utf8");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");

describe("full ranking directories", () => {
  it("keeps the homepage ranking modules as dedicated Top 10 previews", () => {
    expect(homeSource).toContain('href="/rankings/most-viewed"');
    expect(homeSource).toContain('href="/rankings/most-favorited"');
    expect(homeSource).toContain('href="/rankings/top-rated-traders"');
    expect(homeSource).toContain('href="/rankings/top-trade-values"');
  });

  it("exposes public, counted, paginated directory procedures without changing the preview helpers", () => {
    expect(dbSource).toContain('export async function getRankedListingDirectory');
    expect(dbSource).toContain('export type ListingRankingMetric = "most_viewed" | "most_favorited" | "highest_value"');
    expect(dbSource).toContain('isPublicMemberEligible(listings.ownerId)');
    expect(dbSource).toContain('total: Number(countRows[0]?.value ?? 0)');
    expect(routerSource).toContain('rankedListings: publicProcedure');
    expect(routerSource).toContain('getRatedTradersDirectory: publicProcedure');
    expect(routerSource).toContain('limit: z.number().int().min(1).max(48).default(24)');
    expect(routerSource).toContain('LIMIT ${input.limit} OFFSET ${input.offset}');
    expect(routerSource).toContain('const [countRows] = countQuery as unknown as [[{ total?: number | string }], unknown];');
    expect(routerSource).toContain('const [rows] = traderQuery as unknown as [any[], unknown];');
  });

  it("renders all four ranking routes with total counts, ordinal continuity, and pagination", () => {
    expect(rankingPageSource).toContain('const RANKING_PAGE_SIZE = 24');
    expect(rankingPageSource).toContain('trpc.market.rankedListings.useQuery(queryInput)');
    expect(rankingPageSource).toContain('trpc.favorites.getRatedTradersDirectory.useQuery(queryInput)');
    expect(rankingPageSource).toContain('active listing{total === 1 ? "" : "s"}');
    expect(rankingPageSource).toContain('public member{total === 1 ? "" : "s"}');
    expect(rankingPageSource).toContain('const rank = queryInput.offset + index + 1');
    expect(rankingPageSource).toContain('<DirectoryPagination page={page} total={total}');
    expect(rankingPageSource).toContain('export function AllMostViewedRankings()');
    expect(rankingPageSource).toContain('export function AllMostFavoritedRankings()');
    expect(rankingPageSource).toContain('export function AllRatedTradersRankings()');
    expect(rankingPageSource).toContain('export function AllHighestTradeValuesRankings()');
  });
});
