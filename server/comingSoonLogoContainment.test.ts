import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/ComingSoon.tsx", import.meta.url), "utf8");

describe("Coming Soon logo containment", () => {
  it("enlarges only the SVG lockup inside the existing contained logo frame", () => {
    expect(source).toContain('<div className="mx-auto h-20 w-full max-w-[34rem] translate-y-12 overflow-hidden px-2 sm:h-28 sm:max-w-[42rem] sm:translate-y-20 sm:px-4">');
    expect(source).toContain("centeredViewBoxWidth={3000} lockupScale={1.16} canvasWidthScale={1}");
    expect(source).toContain("<AnimatedLogoSmall70");
  });

  it("keeps the surrounding Coming Soon composition unchanged", () => {
    expect(source).toContain("Why Buy or Sell");
    expect(source).toContain("When You Can Trade?");
    expect(source).toContain("Launching Soon");
    expect(source).toContain("Enter your email for early access");
  });
});
