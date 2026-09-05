import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/components/AnimatedLogoSmall70.tsx", import.meta.url), "utf8");

describe("animated logo geometry", () => {
  it("includes the scaled wheel orbit in centered lockup bounds", () => {
    expect(source).toContain("const wheelOrbitRadius = 82 * wheelScale;");
    expect(source).toContain("const wheelVisualLeft = 6 + wheelOffsetX + 0.441 * (104 - wheelOrbitRadius);");
    expect(source).toContain("const phraseLeft = Math.min(15, wheelVisualLeft);");
  });

  it("supports moving the divider and wordmark clear of an enlarged wheel without moving the wheel right", () => {
    expect(source).toContain("contentOffsetX?: number;");
    expect(source).toContain("const wordmarkX = 132 + contentOffsetX;");
    expect(source).toContain("const dividerX = 114 + contentOffsetX;");
    expect(source).toContain("<line x1={dividerX}");
  });

  it("uses a contained narrow-viewport mode for the Coming Soon title", () => {
    expect(source).toContain('window.matchMedia("(max-width: 639px)")');
    expect(source).toContain("const activeCenteredViewBoxWidth = centerLockup && isNarrowViewport ? 1100 : centeredViewBoxWidth;");
    expect(source).toContain("const activeLockupScale = centerLockup && isNarrowViewport ? 0.36 : lockupScale;");
  });

  it("centers each full rotating category label rather than reserving empty width after shorter words", () => {
    expect(source).toContain("const phraseRight = measuredCategoryWordX + categoryWidth;");
    expect(source).toContain("const phraseCenter = (phraseLeft + phraseRight) / 2;");
    expect(source).toContain("const targetCenter = activeCenteredViewBoxWidth / 2;");
    expect(source).toContain("const nextOffset = targetCenter - activeLockupScale * phraseCenter;");
    expect(source).not.toContain("categoryReserveWidth");
    expect(source).not.toContain("getBBox()");
  });
});
