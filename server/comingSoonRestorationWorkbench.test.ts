import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/pages/ComingSoon.tsx"), "utf8");

describe("Coming Soon baseline", () => {
  it("keeps the supplied desktop composition fully visible and the mobile category rail including Music", () => {
    expect(source).toContain('const SUPPLIED_COMING_SOON_HTML_URL = "/manus-storage/tradebilia_coming_soon_exact_ba8c631b.html";');
    expect(source).toContain('className="relative mx-auto hidden aspect-[1815/867] w-full sm:block"');
    expect(source).toContain("<iframe");
    expect(source).toContain("src={SUPPLIED_COMING_SOON_HTML_URL}");
    expect(source).toContain('className="pointer-events-none absolute inset-0 size-full border-0"');
    expect(source).toContain("const mobileCategories = [");
    expect(source).toContain('{ label: "Music", Icon: Music2 }');
    expect(source).toContain('aria-label="Tradebilia mobile launch signup"');
    expect(source).toContain("grid grid-cols-5");
    expect(source).not.toContain("object-cover");
    expect(source).not.toContain("<picture>");
  });
});
