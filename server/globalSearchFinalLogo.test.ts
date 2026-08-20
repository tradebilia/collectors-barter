import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "client/src/pages/SearchResults.tsx"), "utf8");

describe("Global Search final Tradebilia logo", () => {
  it("uses the supplied transparent logo without altering the cross-category query contract", () => {
    expect(source).toContain('/manus-storage/tradebilia-final-transparent_b18f659a.svg');
    expect(source).toContain('alt="Tradebilia"');
    expect(source).not.toContain('AnimatedLogoSmall70');
    expect(source).toContain('trpc.market.search.useQuery(searchInput)');
    expect(source).toContain('setLocation(query ? `/search?q=${encodeURIComponent(query)}` : "/search")');
  });
});
