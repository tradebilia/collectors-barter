import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Coming Soon baseline", () => {
  it("keeps the supplied desktop composition fully visible and the mobile category rail including Music", () => {
    expect(source).toContain('const SUPPLIED_COMING_SOON_SVG_URL = "/manus-storage/Tradebilia_Hero_Logo_Fully_Opaque_Large_fc0f5b5b.svg";');
    expect(source).toContain('className="relative mx-auto hidden aspect-[1810/869] w-full sm:block"');
    expect(source).toContain('src={SUPPLIED_COMING_SOON_SVG_URL}');
    expect(source).toContain('className="absolute inset-0 size-full object-contain"');
    expect(source).toContain("const mobileCategories = [");
    expect(source).toContain('{ label: "Music", Icon: Music2 }');
    expect(source).toContain('aria-label="Tradebilia mobile launch signup"');
    expect(source).toContain("grid grid-cols-5");
    expect(source).not.toContain("<iframe");
    expect(source).not.toContain("<picture>");
  });
});
