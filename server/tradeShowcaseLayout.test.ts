import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const showcaseSource = readFileSync(resolve(process.cwd(), "client/src/pages/TradeShowcase.tsx"), "utf8");

describe("Traders Showcase ownership-transfer layout", () => {
  it("keeps all items from both sides together in one trade-level horizontal exchange", () => {
    expect(showcaseSource).toContain('buildTradeShowcaseExchange(trade)');
    expect(showcaseSource).toContain('flex min-w-[980px] items-center gap-4 p-3');
    expect(showcaseSource).toContain('<TradeParty member={exchange.left.member} />');
    expect(showcaseSource).toContain('<TradeItems items={exchange.left.items} />');
    expect(showcaseSource).toContain('<TradeParty member={exchange.right.member} reverse />');
    expect(showcaseSource).toContain('<TradeItems items={exchange.right.items} />');
    expect(showcaseSource).toContain('overflow-x-auto');
    expect(showcaseSource).toContain('grid grid-cols-1 gap-5');
  });
});
