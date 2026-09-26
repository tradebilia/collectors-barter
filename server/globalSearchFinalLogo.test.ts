import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "client/src/pages/SearchResults.tsx"), "utf8");

describe("Global Search animated Tradebilia title", () => {
  it("uses the shared animated title without altering the cross-category query contract", () => {
    expect(source).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";');
    expect(source).toContain('<AnimatedLogoSmall70 fontSize={135} wheelScale={1.45} dividerScale={1.4} wheelOffsetX={-16} wheelOffsetY={-20} dividerOffsetY={-20} centerLockup />');
    expect(source).toContain('trpc.market.search.useQuery(searchInput)');
    expect(source).toContain('setLocation(query ? `/search?q=${encodeURIComponent(query)}` : "/search")');
    expect(source).toContain('h-36 w-[calc(100vw+8rem)] items-center justify-center overflow-visible');
    expect(source).toContain('style={{ marginLeft: "calc(50% - 50vw)" }}');
    expect(source).toContain('sm:w-[calc(100vw+16rem)]');
    expect(source).toContain('lg:w-[calc(100vw+20rem)] lg:max-w-[120rem]');
    expect(source).toContain('rgba(18,12,8,0.46)');
  });
});
