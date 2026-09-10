import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Coming Soon baseline", () => {
  it("keeps the exact supplied image fully visible with a centered category overlay including Music", () => {
    expect(source).toContain("coming-soon-exact-supplied-clean-row_d8aa56d4.png");
    expect(source).toContain("w-[min(100vw,calc(100svh*605/289))]");
    expect(source).toContain('{ label: "Music", icon: Disc3 }');
    expect(source).toContain("grid-cols-11");
    expect(source).toContain("inset-x-[6%] top-[75%] h-[15%] px-[2%]");
    expect(source).toContain('aria-label="Collections on the exchange"');
    expect(source).not.toContain("object-cover");
    expect(source).not.toContain("<picture>");
    expect(source).not.toContain("tradebilia_final_transparent-Notagline");
  });
});
