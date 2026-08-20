import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("unified global search contracts", () => {
  it("keeps the top-bar destination as a shared all-category search route", () => {
    const topBar = read("client/src/components/TopBar.tsx");
    const app = read("client/src/App.tsx");

    expect(topBar).toContain('setLocation(`/search?q=${encodeURIComponent(value)}`)');
    expect(app).toContain('<Route path="/search" component={SearchResults} />');
  });

  it("reads URL queries, displays Category Page-aligned controls, and links each result to its item detail", () => {
    const searchPage = read("client/src/pages/SearchResults.tsx");

    expect(searchPage).toContain("useSearch()");
    expect(searchPage).toContain("getGlobalSearchQuery(rawSearch)");
    expect(searchPage).toContain("query: submittedQuery,");
    expect(searchPage).not.toContain("if (!submittedQuery) return null");
    expect(searchPage).not.toContain("!submittedQuery ? (");
    expect(searchPage).toContain("trpc.market.search.useQuery(searchInput)");
    expect(searchPage).toContain("Browsing all active listings");
    expect(searchPage).toContain("All active listings across the exchange");
    expect(searchPage).toContain("<TopBar searchPlaceholder=");
    expect(searchPage).toContain("<CategoryBar />");
    expect(searchPage).toContain("AnimatedLogoSmall70 fontSize={125}");
    expect(searchPage).toContain("globalSearchHeroCollageUrl");
    expect(searchPage).toContain("tradebilia-warm-archival-hero-04_cdf269c5.png");
    expect(searchPage).toContain('min-h-[400px]');
    expect(searchPage).toContain("Search the Exchange");
    expect(searchPage).toContain('href={`/listings/${listing.id}`}');
    expect(searchPage).toContain("resolveTradebiliaListingImage");
    expect(searchPage).toContain("Verified merchants only");
    expect(searchPage).toContain("grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6");
  });

  it("uses a typed, paginated all-category server contract and searches all persisted listing fields", () => {
    const router = read("server/routers.ts");
    const database = read("server/db.ts");

    expect(router).toContain('sort: z.enum(["newest", "title", "value_low_high", "value_high_low"]).optional()');
    expect(router).toContain("limit: z.number().int().min(1).max(48).optional()");
    expect(router).toContain("offset: z.number().int().min(0).max(10000).optional()");
    expect(database).toContain("like(listings.itemType, `%${keyword}%`)");
    expect(database).toContain("like(listings.signatures, `%${keyword}%`)");
    expect(database).toContain("CAST(${listings.estimatedValue} AS CHAR)");
    expect(database).toContain("const keyword = filters.keyword?.trim();");
    expect(database).toContain("if (keyword) {");
    expect(database).toContain(".offset(resultOffset)");
  });
});
