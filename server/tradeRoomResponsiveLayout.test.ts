import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const warRoomSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/WarRoom.tsx"), "utf8");
const stylesheet = fs.readFileSync(path.join(projectRoot, "client/src/index.css"), "utf8");

describe("Trade Room responsive completed-trade layout", () => {
  it("keeps receipt and trade-issue actions in a separate full-width flow section before tracking", () => {
    expect(warRoomSource).toContain('aria-label="Trade documents and support actions"');
    expect(warRoomSource).toContain('flex w-full flex-wrap items-center justify-center gap-2 rounded-xl');
    expect(warRoomSource).toContain('relative z-0 w-full flex-none bg-[#16213e]');
  });

  it("stacks actions and tracking details before narrow or zoomed desktop widths can overlap", () => {
    expect(warRoomSource).toContain('w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40');
    expect(warRoomSource).toContain('w-full items-center justify-center gap-2 rounded-lg border border-amber-400/35');
    expect(warRoomSource).toContain('grid grid-cols-1 gap-4 mb-4 lg:grid-cols-2');
    expect(warRoomSource).toContain('{allItems.length > 0 && <div className="grid grid-cols-1 gap-4 mb-4 lg:grid-cols-2">');
    expect(warRoomSource).toContain('flex flex-col gap-3 sm:flex-row');
  });

  it("keeps participant names and side labels readable and uses the requested inventory modal surface treatments", () => {
    expect(warRoomSource).toContain('text-base font-extrabold leading-tight">{myDisplayName}</p>');
    expect(warRoomSource).toContain('text-base font-extrabold leading-tight">{theirDisplayName}</p>');
    expect(warRoomSource).toContain('size="large" className="scale-75 origin-left"');
    expect(warRoomSource).toContain('text-blue-200 text-xs font-bold uppercase tracking-wider">Your Side</p>');
    expect(warRoomSource).toContain('text-blue-200 text-xs font-bold uppercase tracking-wider">Their Side</p>');
    expect(warRoomSource).toContain('border-gray-700 flex-shrink-0 bg-[#16213e]');
    expect(warRoomSource).toContain('bg-white text-slate-900 border border-slate-300');
    expect(warRoomSource).toContain('border-red-200 bg-red-50 text-red-700');
    expect(warRoomSource).toContain('existingTheirTradeItemIds');
    expect(warRoomSource).toContain('existingMyTradeItemIds');
    expect(warRoomSource).toContain('bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold');
    expect(warRoomSource).toContain('border-2 border-white/80 rounded-xl w-11/12 max-w-6xl');
    expect(warRoomSource).toContain('const myReviewHasSingleItem = myItems.length === 1;');
    expect(warRoomSource).toContain('const theirReviewHasSingleItem = theirItems.length === 1;');
    expect(warRoomSource).toContain("${myReviewHasSingleItem ? 'w-full h-72' : 'w-28 h-28'}");
    expect(warRoomSource).toContain("${theirReviewHasSingleItem ? 'w-full h-72' : 'w-28 h-28'}");
    expect(warRoomSource).toContain('text-white font-bold text-2xl">Shipping Information</h2>');
    expect(warRoomSource).toContain('className="space-y-3 text-base"');
    expect(warRoomSource).toContain('bg-[#0f0f1a] border border-white/40 rounded-xl p-6');
    expect(warRoomSource).toContain('formatTimelineDetails(event, cfg.label)');
    expect(warRoomSource).toContain('Selected ${method} as payment method');
    expect(warRoomSource).toContain('w-10 h-10 text-cyan-300');
    expect(warRoomSource).toContain("${myReviewHasSingleItem ? 'text-xl' : 'text-sm'}");
    expect(warRoomSource).toContain('text-gray-300 text-sm font-mono mt-1');
    expect(warRoomSource).toContain('w-full min-h-[38rem]');
    expect(warRoomSource).toContain('data-testid="shipping-counterparty-locked-items"');
    expect(warRoomSource).toContain('Cash payment & shipping tasks');
    expect(warRoomSource).toContain('The member sending cash must complete the payment and mark it sent.');
    expect(warRoomSource).toContain('uppercase tracking-wide animate-pulse');
    expect(warRoomSource).toContain('bg-white border border-slate-300 text-slate-900');
    expect(warRoomSource).toContain('Tracking Numbers not submitted');
    expect(warRoomSource).toContain('Tracking Numbers submitted');
    expect(warRoomSource).toContain('Press Enter to lock every tracking number before submitting.');
    expect(warRoomSource).toContain('>Enter</button>');
    expect(warRoomSource).toContain('>Reset</button>');
    expect(warRoomSource).toContain('myShippingItems.length > 0 && (myTracking.length === 0 || resetTrackingIds.length > 0)');
  });

  it("uses a fixed-height rail only on wide desktops and otherwise lets the entire workspace scroll naturally", () => {
    expect(warRoomSource).toContain('trade-room-shell flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#0f0f1a]');
    expect(warRoomSource).toContain('trade-room-workspace flex min-h-0 flex-1 flex-col overflow-visible');
    expect(warRoomSource).toContain('trade-room-content flex flex-1 flex-col overflow-visible p-4 custom-scrollbar');
    expect(warRoomSource).toContain('trade-room-chat-rail flex min-h-[34rem] w-full flex-shrink-0 flex-col p-4');
    expect(stylesheet).toContain('@media (min-width: 1280px) and (min-height: 760px)');
    expect(stylesheet).toContain('.trade-room-chat-rail');
    expect(stylesheet).toContain('height: 100%;');
    expect(warRoomSource).toContain('px-3 py-3 sm:px-6 sm:py-4');
  });
});
