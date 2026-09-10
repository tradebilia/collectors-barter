import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Coming Soon baseline", () => {
  it("keeps the exact supplied image fully visible with only the requested Music category overlay", () => {
    expect(source).toContain("coming-soon-exact-supplied_6f741f0e.png");
    expect(source).toContain("w-[min(100vw,calc(100svh*605/289))]");
    expect(source).toContain('aria-label="Music"');
    expect(source).toContain("<Disc3");
    expect(source).not.toContain("object-cover");
    expect(source).not.toContain("<picture>");
    expect(source).not.toContain("tradebilia_final_transparent-Notagline");
  });
});
