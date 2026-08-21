import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "client/src/pages/SearchResults.tsx"), "utf8");

describe("Global Search animated Tradebilia title", () => {
  it("uses the shared animated title without altering the cross-category query contract", () => {
    expect(source).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";');
    expect(source).toContain('<AnimatedLogoSmall70 fontSize={135} wheelScale={0.84} dividerScale={0.84} fixedCategoryMetrics centerLockup />');
    expect(source).toContain('trpc.market.search.useQuery(searchInput)');
    expect(source).toContain('setLocation(query ? `/search?q=${encodeURIComponent(query)}` : "/search")');
    expect(source).toContain('h-36 w-[calc(100vw-2rem)] max-w-[100rem]');
  });
});
