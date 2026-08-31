import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const warRoomSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/WarRoom.tsx"), "utf8");

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
});
