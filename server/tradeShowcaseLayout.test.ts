import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const showcaseSource = readFileSync(resolve(process.cwd(), "client/src/pages/TradeShowcase.tsx"), "utf8");
const recentTradesSource = readFileSync(resolve(process.cwd(), "client/src/components/RecentTradesCarousel.tsx"), "utf8");
const exchangeSource = readFileSync(resolve(process.cwd(), "client/src/lib/tradeShowcaseMovements.ts"), "utf8");
const completedTradeQuerySource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("Traders Showcase ownership-transfer layout", () => {
  it("uses the compact homepage exchange format across the full Showcase width", () => {
    expect(showcaseSource).toContain('buildTradeShowcaseExchange(trade)');
    expect(showcaseSource).toContain('<TradeMember member={exchange.left.member} />');
    expect(showcaseSource).toContain('<TradeItemList items={exchange.left.items} cashPaid={exchange.left.cashPaid} />');
    expect(showcaseSource).toContain('<DirectionMarker side="left" />');
    expect(showcaseSource).toContain('<TradeItemList items={exchange.right.items} cashPaid={exchange.right.cashPaid} />');
    expect(showcaseSource).toContain('<DirectionMarker side="right" />');
    expect(showcaseSource).toContain('<TradeMember member={exchange.right.member} />');
    expect(showcaseSource).toContain('ticket-card w-full overflow-hidden border-4 border-[#3974bb]');
    expect(showcaseSource).toContain('md:grid-cols-[minmax(9rem,0.9fr)_1px_minmax(12rem,1.25fr)_auto_1px_minmax(8rem,0.75fr)_1px_auto_minmax(12rem,1.25fr)_1px_minmax(9rem,0.9fr)]');
    expect(showcaseSource).toContain('w-full px-4 pb-16 sm:px-6 lg:px-8');
    expect(showcaseSource).not.toContain('overflow-x-auto');
    expect(showcaseSource).not.toContain('min-w-[1120px]');
    expect(showcaseSource).not.toContain('<TradeParty');
    expect(showcaseSource).not.toContain('<TradeItems');
    expect(showcaseSource).toContain('grid grid-cols-1 gap-5');
  });

  it("includes completed cash directions and cash-inclusive value without revealing payment destinations", () => {
    expect(exchangeSource).toContain("cashFromRequester?: string | number | null;");
    expect(exchangeSource).toContain("cashFromRecipient?: string | number | null;");
    expect(exchangeSource).toContain("cashPaid: Number(trade.cashFromRecipient ?? 0) || 0");
    expect(exchangeSource).toContain("cashPaid: Number(trade.cashFromRequester ?? 0) || 0");
    expect(recentTradesSource).toContain("Cash paid");
    expect(showcaseSource).toContain('<TradeItemList items={exchange.left.items} cashPaid={exchange.left.cashPaid} />');
    expect(showcaseSource).toContain('<TradeItemList items={exchange.right.items} cashPaid={exchange.right.cashPaid} />');
    expect(completedTradeQuerySource).toContain("tp.cashFromRequester,");
    expect(completedTradeQuerySource).toContain("tp.cashFromRecipient,");
    expect(completedTradeQuerySource).toContain("+ COALESCE(tp.cashFromRequester, 0)");
    expect(completedTradeQuerySource).toContain("+ COALESCE(tp.cashFromRecipient, 0) as totalValue");
    expect(showcaseSource).not.toContain("paymentIdentifier");
    expect(recentTradesSource).not.toContain("paymentIdentifier");
  });

  it("keeps multi-item recent trades inside the fixed carousel card without vertical scrolling", () => {
    expect(recentTradesSource).toContain("const MAX_VISIBLE_ITEM_PREVIEWS = 4");
    expect(recentTradesSource).toContain("const visibleItems = items.slice(0, MAX_VISIBLE_ITEM_PREVIEWS)");
    expect(recentTradesSource).toContain("const hiddenItemCount = Math.max(0, items.length - visibleItems.length)");
    expect(recentTradesSource).toContain('isMultiItemTrade ? "grid-cols-2" : "grid-cols-1"');
    expect(recentTradesSource).toContain('+{hiddenItemCount} more item');
    expect(recentTradesSource).toContain('h-[60rem] overflow-hidden');
    expect(recentTradesSource).not.toContain('flex-1 gap-1 overflow-y-auto px-4 py-4');
  });

  it("renders completed-trade items as non-clickable historical snapshots", () => {
    expect(recentTradesSource).not.toContain('import { Link } from "wouter"');
    expect(recentTradesSource).not.toContain('href={`/listings/${item.id}`}');
    expect(recentTradesSource).not.toContain('focus-visible:ring-2 focus-visible:ring-violet-600');
    expect(recentTradesSource).toContain('return <div key={`${item.id || item.title}-${index}`} className={className}>{content}</div>;');
  });
});
