import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const topBarSource = readFileSync(resolve(process.cwd(), "client/src/components/TopBar.tsx"), "utf8");
const compactTopBarStart = topBarSource.indexOf("if (hideSearch)");
const compactTopBarSource = topBarSource.slice(compactTopBarStart, topBarSource.indexOf("\n  return (\n", compactTopBarStart));

describe("compact TopBar animated logo", () => {
  it("uses the shared desktop animated-logo geometry rather than a smaller compact logo", () => {
    expect(compactTopBarSource).toContain("absolute left-2 h-16 hidden items-center sm:flex");
    expect(compactTopBarSource).toContain("style={{ width: '650px', top: '-10px' }}");
    expect(compactTopBarSource).toContain('<AnimatedLogoSmall70 />');
  });
});
