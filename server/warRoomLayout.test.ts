import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Trade Room item-card layout", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/WarRoom.tsx"), "utf8");

  it("keeps the desktop trade table shrinkable at normal browser zoom", () => {
    expect(source).toContain('className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-11"');
    expect(source.match(/className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-600 bg-\[#0f0f1a\] p-4 lg:col-span-4"/g)).toHaveLength(2);
  });

  it("clips both side item cards and limits the single-item footprint", () => {
    expect(source).toContain("relative group overflow-hidden ${getItemCardSpacing(myItems.length)}");
    expect(source).toContain("relative group overflow-hidden ${getItemCardSpacing(theirItems.length)}");
    expect(source).toContain("h-64 sm:h-72 lg:h-[18rem]");
    expect(source).toContain("min-h-[25rem] p-4");
  });

  it("keeps both remove controls visible inside their card bounds", () => {
    const removeControlClass = "absolute top-2 right-2 z-20 bg-red-600/95";
    expect(source.match(new RegExp(removeControlClass.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"), "g"))).toHaveLength(2);
    expect(source.match(/title=\"Remove from trade\"/g)).toHaveLength(2);
    expect(source).not.toContain("-top-1.5 -right-1.5");
  });

  it("keeps the message-send button inside the chat composer bubble", () => {
    expect(source).toContain("bg-white border border-gray-300 rounded-xl px-3 py-2 pr-4 shadow-sm");
  });
});
