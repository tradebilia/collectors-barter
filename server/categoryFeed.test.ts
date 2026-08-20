import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression tests for the category page "0 results" bug.
 *
 * Root cause: CategoryPage.tsx built its tRPC query input by listing all ~30
 * filter keys unconditionally. superjson serializes the unused ones as explicit
 * `undefined` entries in the batched GET URL. That inflated the combined batch
 * URL past httpBatchLink's `maxURLLength: 2000`, so the tRPC client silently
 * downgraded the request to POST. tRPC v11 rejects POST on *query* procedures
 * with 405 METHOD_NOT_SUPPORTED, so market.feed never resolved and every
 * category page rendered "Showing 0 results" / an endless spinner.
 */

const categoryPageSource = readFileSync(
  join(process.cwd(), "client/src/pages/CategoryPage.tsx"),
  "utf-8",
);

/** Mirrors the `add()` guard used in CategoryPage's queryInput useMemo. */
function buildQueryInput(
  slug: string | undefined,
  filters: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!slug) return undefined;
  const input: Record<string, unknown> = { category: slug };
  for (const [key, value] of Object.entries(filters)) {
    if (key === "verifiedMerchantsOnly") {
      if (value) input.verifiedMerchantsOnly = true;
      continue;
    }
    if (value === undefined || value === null || value === "") continue;
    input[key] = value;
  }
  return input;
}

const ALL_FILTER_KEYS = [
  "keyword", "condition", "issueNumber", "manufacturer", "year", "team",
  "series", "sport", "gradingService", "grade", "valueMin", "valueMax",
  "rookie", "autographed", "signed", "facsimile", "rarity", "title",
  "system", "region", "country", "format", "medium", "denomination",
  "mintMark", "issuer", "edition", "parkOrEvent", "franchise",
  "publisher", "brand", "scottNumber", "mintOrUsed", "editionEra",
  "finishVariant", "signer", "stampGrade",
  "distanceMiles",
];

/** Default (untouched) filter state as the page initializes it. */
const defaultFilters: Record<string, unknown> = {
  ...Object.fromEntries(ALL_FILTER_KEYS.map(k => [k, undefined])),
  keyword: "",
  verifiedMerchantsOnly: false,
};

describe("CategoryPage feed query input", () => {
  it("sends only the category when no filters are applied", () => {
    const input = buildQueryInput("sports_cards", defaultFilters);
    expect(input).toEqual({ category: "sports_cards" });
  });

  it("never includes undefined-, null-, or empty-string-valued keys", () => {
    const input = buildQueryInput("comics", defaultFilters)!;
    for (const [key, value] of Object.entries(input)) {
      expect(value, `key "${key}" must carry a real value`).not.toBeUndefined();
      expect(value, `key "${key}" must not be null`).not.toBeNull();
      expect(value, `key "${key}" must not be an empty string`).not.toBe("");
    }
  });

  it("omits verifiedMerchantsOnly entirely when the toggle is off", () => {
    const input = buildQueryInput("comics", defaultFilters)!;
    expect("verifiedMerchantsOnly" in input).toBe(false);
  });

  it("includes verifiedMerchantsOnly only when the toggle is on", () => {
    const input = buildQueryInput("comics", {
      ...defaultFilters,
      verifiedMerchantsOnly: true,
    })!;
    expect(input.verifiedMerchantsOnly).toBe(true);
  });

  it("passes through filters the user actually set", () => {
    const input = buildQueryInput("sports_cards", {
      ...defaultFilters,
      keyword: "gretzky",
      manufacturer: "O-Pee-Chee",
      grade: "9",
      valueMin: 100,
      editionEra: "1st Edition",
      scottNumber: "572",
    })!;
    expect(input).toEqual({
      category: "sports_cards",
      keyword: "gretzky",
      manufacturer: "O-Pee-Chee",
      grade: "9",
      valueMin: 100,
      editionEra: "1st Edition",
      scottNumber: "572",
    });
  });

  it("keeps valueMin=0 (a falsy but meaningful number)", () => {
    const input = buildQueryInput("coins", { ...defaultFilters, valueMin: 0 })!;
    expect(input.valueMin).toBe(0);
  });

  it("keeps a submitted distance range while omitting it when the dropdown is untouched", () => {
    const untouched = buildQueryInput("movies", defaultFilters)!;
    const withinFiftyMiles = buildQueryInput("movies", { ...defaultFilters, distanceMiles: 50 })!;

    expect("distanceMiles" in untouched).toBe(false);
    expect(withinFiftyMiles.distanceMiles).toBe(50);
  });

  it("returns undefined when there is no slug so the query stays disabled", () => {
    expect(buildQueryInput(undefined, defaultFilters)).toBeUndefined();
  });

  it("stays far below httpBatchLink's 2000-char maxURLLength", () => {
    const input = buildQueryInput("sports_cards", defaultFilters)!;
    const url =
      "/api/trpc/market.feed?batch=1&input=" +
      encodeURIComponent(JSON.stringify({ 0: { json: input } }));
    expect(url.length).toBeLessThan(500);
  });

  it("would have exceeded the URL limit under the old always-send-every-key shape", () => {
    // Reproduces the regression: superjson marks each unused key as undefined.
    const legacyJson: Record<string, unknown> = { category: "sports_cards", keyword: "" };
    const legacyMeta = Object.fromEntries(
      ALL_FILTER_KEYS.filter(k => k !== "keyword").map(k => [k, ["undefined"]]),
    );
    const url =
      "/api/trpc/market.feed?batch=1&input=" +
      encodeURIComponent(
        JSON.stringify({ 0: { json: legacyJson, meta: { values: legacyMeta } } }),
      );
    // Far larger than the fixed shape; this bloat is what pushed the combined
    // page batch over the limit and forced the fatal POST fallback.
    expect(url.length).toBeGreaterThan(1000);
  });
});

describe("CategoryPage source guards", () => {
  it("builds the query input with the value-omitting add() helper", () => {
    expect(categoryPageSource).toContain("const add = (key: string, value: unknown)");
    expect(categoryPageSource).toContain('if (value === undefined || value === null || value === "") return;');
  });

  it("does not reintroduce the always-send-every-key object literal", () => {
    expect(categoryPageSource).not.toContain("condition: submittedFilters.condition,");
    expect(categoryPageSource).not.toContain("franchise: submittedFilters.franchise,");
  });

  it("leaves no temporary debug logging behind", () => {
    expect(categoryPageSource).not.toContain("CATDEBUG");
  });
});
