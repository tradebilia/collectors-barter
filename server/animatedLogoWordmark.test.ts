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

  it("keeps the enlarged category label clear of TRADE and constrains long labels", () => {
    expect(logoSource).toContain("const LARGE_CATEGORY_WORD_X = 580;");
    expect(logoSource).toContain("const LARGE_CATEGORY_TEXT_LENGTH = 680;");
    expect(logoSource).toContain('lengthAdjust={categoryTextLength ? "spacingAndGlyphs" : undefined}');
    expect(logoSource).toContain("currentCategory.name.length >= 10");
  });

  it("keeps the larger 125-unit mark scoped to the Coming Soon hero", () => {
    const comingSoonSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ComingSoon.tsx"), "utf8");
    expect(comingSoonSource).toContain('<AnimatedLogoSmall70 fontSize={125} wordmarkColor="#211b17" neutralCategoryColor="#211b17" wheelScale={1.18} />');
  });
});
