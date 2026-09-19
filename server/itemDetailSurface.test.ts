import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/ItemDetail.tsx", import.meta.url), "utf8");

describe("item-detail category surface", () => {
  it("uses one page-level Vintage Toys background rather than restarting it before details", () => {
    expect(source).toContain("bg-[linear-gradient(180deg,#454342_0%,#c8c8c2_100%)] text-[#1e1d1a]");
    expect(source).toContain('<div className={`min-h-screen ${pageBackgroundClass}`}>');
    expect(source).toContain('<section className="relative px-4 pt-4 pb-10 lg:px-8">');
    expect(source).not.toContain('px-4 pt-4 pb-10 lg:px-8 relative ${getItemDetailPageClassName(listing.category)}');
  });
});
