import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const logoSource = fs.readFileSync(
  path.join(projectRoot, "client/src/components/AnimatedLogoSmall70.tsx"),
  "utf8",
);

describe("Animated Tradebilia wordmark", () => {
  it("uses the requested 125-unit font while preserving the required SVG contract", () => {
    expect(logoSource).toContain("const LARGE_WORDMARK_FONT_SIZE = 125;");
    expect(logoSource).toContain("fontSize?: number;");
    expect(logoSource).toContain("wordmarkColor?: string;");
    expect(logoSource).toContain("neutralCategoryColor?: string;");
    expect(logoSource).toContain("wheelScale?: number;");
    expect(logoSource).toContain('scale(0.441) translate(104, 110) scale(${wheelScale}) translate(-104, -110)');
    expect(logoSource).toContain('viewBox="0 0 1300 216"');
    expect(logoSource).toContain('preserveAspectRatio="xMinYMid meet"');
  });

  it("keeps Global Search category rotations on one fixed-size, fixed-baseline track", () => {
    const globalSearchSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/SearchResults.tsx"), "utf8");
    expect(logoSource).toContain("const GLOBAL_SEARCH_CATEGORY_WORD_X = 480;");
    expect(logoSource).toContain("fixedCategoryMetrics?: boolean;");
    expect(logoSource).toContain("fixedCategoryMetrics = false,");
    expect(logoSource).not.toContain("textLength={");
    expect(logoSource).not.toContain("lengthAdjust={");
    expect(globalSearchSource).toContain('<AnimatedLogoSmall70 fontSize={96} fixedCategoryMetrics />');
  });

  it("keeps the larger 125-unit mark scoped to the Coming Soon hero", () => {
    const comingSoonSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ComingSoon.tsx"), "utf8");
    expect(comingSoonSource).toContain('<AnimatedLogoSmall70 fontSize={125} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" wheelScale={1.18} />');
  });
});
