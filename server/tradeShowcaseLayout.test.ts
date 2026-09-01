import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const showcaseSource = readFileSync(resolve(process.cwd(), "client/src/pages/TradeShowcase.tsx"), "utf8");
const recentTradesSource = readFileSync(resolve(process.cwd(), "client/src/components/RecentTradesCarousel.tsx"), "utf8");
const exchangeSource = readFileSync(resolve(process.cwd(), "client/src/lib/tradeShowcaseMovements.ts"), "utf8");
const completedTradeQuerySource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

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

  it("includes completed cash directions and cash-inclusive value without revealing payment destinations", () => {
    expect(exchangeSource).toContain("cashFromRequester?: string | number | null;");
    expect(exchangeSource).toContain("cashFromRecipient?: string | number | null;");
    expect(exchangeSource).toContain("cashPaid: Number(trade.cashFromRecipient ?? 0) || 0");
    expect(exchangeSource).toContain("cashPaid: Number(trade.cashFromRequester ?? 0) || 0");
    expect(recentTradesSource).toContain("Cash paid");
    expect(showcaseSource).toContain("function CashPaid");
    expect(showcaseSource).toContain("<CashPaid amount={exchange.left.cashPaid} />");
    expect(showcaseSource).toContain("<CashPaid amount={exchange.right.cashPaid} />");
    expect(completedTradeQuerySource).toContain("tp.cashFromRequester,");
    expect(completedTradeQuerySource).toContain("tp.cashFromRecipient,");
    expect(completedTradeQuerySource).toContain("+ COALESCE(tp.cashFromRequester, 0)");
    expect(completedTradeQuerySource).toContain("+ COALESCE(tp.cashFromRecipient, 0) as totalValue");
    expect(showcaseSource).not.toContain("paymentIdentifier");
    expect(recentTradesSource).not.toContain("paymentIdentifier");
  });
});
