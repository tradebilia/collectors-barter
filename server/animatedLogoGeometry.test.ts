import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/components/AnimatedLogoSmall70.tsx", import.meta.url), "utf8");

describe("animated logo geometry", () => {
  it("includes the scaled wheel orbit in centered lockup bounds", () => {
    expect(source).toContain("const wheelOrbitRadius = 82 * wheelScale;");
    expect(source).toContain("const wheelVisualLeft = 6 + wheelOffsetX + 0.441 * (104 - wheelOrbitRadius);");
    expect(source).toContain("const lockupLeft = Math.min(15, wheelVisualLeft);");
  });

  it("supports moving the divider and wordmark clear of an enlarged wheel without moving the wheel right", () => {
    expect(source).toContain("contentOffsetX?: number;");
    expect(source).toContain("const wordmarkX = 132 + contentOffsetX;");
    expect(source).toContain("const dividerX = 114 + contentOffsetX;");
    expect(source).toContain("<line x1={dividerX}");
  });

  it("centers each full rotating category label rather than reserving empty width after shorter words", () => {
    expect(source).toContain("const lockupRight = categoryWordX + categoryWidth;");
    expect(source).not.toContain("categoryReserveWidth");
  });
});
