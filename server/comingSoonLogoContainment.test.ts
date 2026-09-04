import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/ComingSoon.tsx", import.meta.url), "utf8");

describe("Coming Soon logo containment", () => {
  it("enlarges only the SVG lockup inside the existing contained logo frame", () => {
    expect(source).toContain('<div className="mx-auto -mx-2 h-24 w-[calc(100%+1rem)] max-w-[calc(100%+1rem)] translate-y-12 overflow-visible px-2 sm:-mx-8 sm:h-32 sm:w-[calc(100%+4rem)] sm:max-w-[50rem] sm:translate-y-20 sm:px-4">');
    expect(source).toContain("centeredViewBoxWidth={3200} lockupScale={1.24} canvasWidthScale={1}");
    expect(source).toContain("<AnimatedLogoSmall70");
  });

  it("keeps the surrounding Coming Soon composition unchanged", () => {
    expect(source).toContain("Why Buy or Sell");
    expect(source).toContain("When You Can Trade?");
    expect(source).toContain("Launching Soon");
    expect(source).toContain("Enter your email for early access");
  });
});
