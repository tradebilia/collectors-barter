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
    expect(categoryPageSource).toContain('Sports Card');
    expect(categoryPageSource).toContain('Exchange');
    expect(categoryPageSource).toContain('fontFamily: "Bebas Neue, Oswald, Inter, sans-serif"');
    expect(categoryPageSource).toContain('pointer-events-none absolute inset-0');
    expect(categoryPageSource).not.toContain('rounded-[2.25rem] border border-white/12 bg-[linear-gradient(135deg,rgba(12,55,66,0.94)_0%,rgba(28,111,127,0.78)_44%,rgba(8,33,42,0.95)_100%)]');
    expect(categoryPageSource).not.toContain('rounded-full bg-[rgba(255,243,213,0.08)]');
    expect(categoryPageSource).not.toContain('SPORTS_CARDS_SHORT_LOGO_URL');
    expect(categoryPageSource).not.toContain('Hall-of-fame cardboard');
  });

  it("keeps the Sports Cards spotlight area aligned with the flatter retro card-table benchmark", () => {
    expect(categoryPageSource).toContain("Show-floor highlights");
    expect(categoryPageSource).toContain("Featured cardboard arranged more like a real card table.");
    expect(categoryPageSource).toContain('transition duration-500 group-hover:scale-[1.02]');
    expect(categoryPageSource).toContain('aspect-[7/9]');
    expect(categoryPageSource).toContain('object-contain');
  });

  it("uses manual-entry Sports Cards filters without the extra boxed helper sections", () => {
    expect(categoryPageSource).toContain('{ label: "Year / era", placeholder: "1950s, 1986, junk wax, ultra-modern" }');
    expect(categoryPageSource).toContain('{ label: "Set / series", placeholder: "Topps Chrome, Prizm, Fleer" }');
    expect(categoryPageSource).toContain('{ label: "Priority traits", placeholder: "Rookie, autograph, patch relic, Hall of Fame" }');
    expect(categoryPageSource).toContain('placeholder="Gem Mint, Near Mint, raw"');
    expect(categoryPageSource).not.toContain("Collector-grade search");
    expect(categoryPageSource).not.toContain("Card-show shortcuts");
    expect(categoryPageSource).not.toContain("Subscriber tools");
  });

  it("displays compact search result cards in a multi-column grid layout", () => {
    expect(categoryPageSource).toContain('grid-cols-6');
    expect(categoryPageSource).toContain('gap-2');
  });

  it("extends the inventory-style spotlight treatment to the broader category rollout", () => {
    expect(categoryPageSource).toContain("Collector spotlights");
    expect(categoryPageSource).toContain("Featured pieces that keep the exchange feeling curated.");
    expect(categoryPageSource).toContain("Benchmark lane");
    expect(categoryPageSource).toContain("benchmarkSpotlights.length > 0");
  });

  it("uses a left sidebar layout with filters on the left and content on the right", () => {
    expect(categoryPageSource).toContain('main className="flex"');
    expect(categoryPageSource).toContain('w-80 border-r border-current/10');
    expect(categoryPageSource).toContain('flex-1');
  });
});
