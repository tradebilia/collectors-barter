import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const showcaseSource = readFileSync(resolve(process.cwd(), "client/src/pages/TradeShowcase.tsx"), "utf8");

describe("Traders Showcase ownership-transfer layout", () => {
  it("keeps all items from both sides together in one trade-level horizontal exchange", () => {
    expect(showcaseSource).toContain('buildTradeShowcaseExchange(trade)');
    expect(showcaseSource).toContain('flex min-w-[1120px] items-center gap-5 p-4');
    expect(showcaseSource).toContain('<TradeParty member={exchange.left.member} />');
    expect(showcaseSource).toContain('<TradeItems items={exchange.left.items} />');
    expect(showcaseSource).toContain('<TradeParty member={exchange.right.member} reverse />');
    expect(showcaseSource).toContain('<TradeItems items={exchange.right.items} />');
    expect(showcaseSource).toContain('h-10 w-10 shrink-0 text-purple-500');
    expect(showcaseSource).toContain('whitespace-nowrap text-xs font-semibold text-gray-800');
    expect(showcaseSource).not.toContain('Trading</p>');
    expect(showcaseSource).toContain('overflow-x-auto');
    expect(showcaseSource).toContain('grid grid-cols-1 gap-5');
  });
});
