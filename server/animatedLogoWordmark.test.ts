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
    expect(logoSource).toContain("dividerScale?: number;");
    expect(logoSource).toContain("wheelStrokeWidth?: number;");
    expect(logoSource).toContain("dividerStrokeWidth?: number;");
    expect(logoSource).toContain('scale(0.441) translate(104, 110) scale(${wheelScale}) translate(-104, -110)');
    expect(logoSource).toContain('viewBox={`0 0 ${dynamicViewBoxWidth} 216`}');
    expect(logoSource).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it("keeps Global Search category rotations on one fixed-size, fixed-baseline track", () => {
    const globalSearchSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/SearchResults.tsx"), "utf8");
    expect(logoSource).toContain("const GLOBAL_SEARCH_CATEGORY_WORD_X = 480;");
    expect(logoSource).toContain("fixedCategoryMetrics?: boolean;");
    expect(logoSource).toContain("fixedCategoryMetrics = false,");
    expect(logoSource).not.toContain("textLength={");
    expect(logoSource).not.toContain("lengthAdjust={");
    expect(logoSource).toContain('centerLockup?: boolean;');
    expect(logoSource).toContain('centeredViewBoxWidth?: number;');
    expect(logoSource).toContain('const CENTERED_LOCKUP_VIEWBOX_WIDTH = 1800;');
    expect(logoSource).toContain('centeredViewBoxWidth = CENTERED_LOCKUP_VIEWBOX_WIDTH,');
    expect(logoSource).toContain('const dividerHalfHeight = 48.6 * dividerScale;');
    expect(logoSource).toContain('setDynamicViewBoxWidth(fittedViewBoxWidth);');
    expect(logoSource).toContain('const wordmarkTextRef = useRef<SVGTextElement>(null);');
    expect(logoSource).toContain('const categoryGap = currentCategory.name === "BILIA" ? fontSize * 0.04 : fontSize * 0.22;');
    expect(logoSource).toContain('Math.ceil(wordmarkX + (measuredWordmarkWidth || wordmarkTextWidth) + categoryGap)');
    expect(logoSource).toContain('dividerOffsetY?: number;');
    expect(globalSearchSource).toContain('<AnimatedLogoSmall70 fontSize={135} wheelScale={1.45} dividerScale={1.4} wheelOffsetX={-16} wheelOffsetY={-20} dividerOffsetY={-20} centerLockup />');
  });

  it("keeps the shared animated-logo customization contract available", () => {
    expect(logoSource).toContain('categoryColorOverrides?: Partial<Record<(typeof categories)[number]["name"], string>>;');
    expect(logoSource).toContain('categoryColorOverrides = {},');
    expect(logoSource).toContain('categoryColorOverrides[currentCategory.name] ?? currentCategory.color');
    expect(logoSource).toContain('wheelColors?: WheelColors;');
    expect(logoSource).toContain('lockupScale?: number;');
    expect(logoSource).toContain('canvasWidthScale?: number;');
    expect(logoSource).toContain('canvasWidthScale = 1,');
    expect(logoSource).toContain('width: `${renderedCanvasWidthScale * 100}%`');
    expect(logoSource).toContain('lockupScale = 1,');
    expect(logoSource).toContain('const activeLockupScale = centerLockup && isNarrowViewport ? 0.68 : lockupScale;');
    expect(logoSource).toContain('wheelColors = DEFAULT_WHEEL_COLORS,');
    expect(logoSource).toContain('fill={wheelColors[0]} stroke={wheelColors[0]}');
  });
});
