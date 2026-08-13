import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const showcaseSource = readFileSync(resolve(process.cwd(), "client/src/pages/TradeShowcase.tsx"), "utf8");

describe("Traders Showcase ownership-transfer layout", () => {
  it("keeps original owner, item, and receiving member on one horizontal flow", () => {
    expect(showcaseSource).toContain('flex min-w-[650px] items-center gap-3 p-3');
    expect(showcaseSource).toContain('Original owner');
    expect(showcaseSource).toContain('min-w-[250px] flex-1 items-center gap-3');
    expect(showcaseSource).toContain('Now with');
    expect(showcaseSource).toContain('overflow-x-auto');
    expect(showcaseSource).not.toContain('grid grid-cols-[1fr_auto_1fr]');
    expect(showcaseSource).toContain('grid grid-cols-1 gap-5');
    expect(showcaseSource).not.toContain('sm:grid-cols-2 lg:grid-cols-3');
  });
});
