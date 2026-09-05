import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/ComingSoon.tsx", import.meta.url), "utf8");

describe("Coming Soon logo containment", () => {
  it("expands the SVG lockup frame for the enlarged wheel and long category labels", () => {
    expect(source).toContain('<div className="mx-auto flex aspect-[20/4] min-h-32 w-full max-w-full translate-y-12 items-center overflow-hidden sm:relative sm:left-1/2 sm:-translate-x-1/2 sm:aspect-[20/4] sm:min-h-32 sm:w-[calc(100%+12rem)] sm:max-w-[54rem] sm:translate-y-20 sm:overflow-visible sm:px-4">');
    expect(source).toContain("wheelOffsetX={-65} wheelOffsetY={-65}");
    expect(source).toContain("wheelStrokeWidth={0}");
    expect(source).toContain("dividerScale={1.55}");
    expect(source).toContain("centeredViewBoxWidth={4800} lockupScale={1.55} canvasWidthScale={1} contentOffsetX={56}");
    expect(source).not.toContain("lockupCenterBiasX={-240}");
    expect(source).toContain("<AnimatedLogoSmall70");
  });

  it("keeps the surrounding Coming Soon composition unchanged", () => {
    expect(source).toContain("Why Buy or Sell");
    expect(source).toContain("When You Can Trade?");
    expect(source).toContain("Launching Soon");
    expect(source).toContain("Enter your email for early access");
  });
});
