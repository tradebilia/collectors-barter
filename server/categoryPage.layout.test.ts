import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tradebilia category page layout", () => {
  const categoryPageSource = readFileSync(
    resolve(process.cwd(), "client/src/pages/CategoryPage.tsx"),
    "utf8",
  );

  it("uses the transparent longform Tradebilia logo in the Sports Cards header without the old circular badge", () => {
    expect(categoryPageSource).toContain('const SPORTS_CARDS_LONG_LOGO_URL = "/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png"');
    expect(categoryPageSource).toContain('alt="Tradebilia Collectors Trading Exchange"');
    expect(categoryPageSource).not.toContain('rounded-full bg-[rgba(255,243,213,0.08)]');
    expect(categoryPageSource).not.toContain('SPORTS_CARDS_SHORT_LOGO_URL');
  });

  it("keeps the Sports Cards spotlight area aligned with the flatter retro card-table benchmark", () => {
    expect(categoryPageSource).toContain("Show-floor highlights");
    expect(categoryPageSource).toContain("Featured cardboard arranged more like a real card table.");
    expect(categoryPageSource).toContain("Show-floor pick");
    expect(categoryPageSource).toContain('className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.02]"');
    expect(categoryPageSource).toContain('isSportsCardsPage ? "aspect-[7/9] bg-[linear-gradient(180deg,rgba(243,228,188,0.92)_0%,rgba(232,214,168,0.92)_100%)] p-4" : "aspect-[4/5] bg-black/10"');
    expect(categoryPageSource).toContain('className={isSportsCardsPage ? "h-full w-full object-contain p-3" : "h-full w-full object-cover"}');
  });

  it("extends the inventory-style spotlight treatment to the broader category rollout", () => {
    expect(categoryPageSource).toContain("Collector spotlights");
    expect(categoryPageSource).toContain("Featured pieces that keep the exchange feeling curated.");
    expect(categoryPageSource).toContain("Benchmark lane");
    expect(categoryPageSource).toContain("benchmarkSpotlights.length > 0");
  });
});
