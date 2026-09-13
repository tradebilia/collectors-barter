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
    expect(source).toContain("relative flex items-center bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-sm");
    expect(source).toContain("absolute inset-y-0 right-3 flex items-center gap-3");
    expect(source).toContain("flex-1 min-w-0 bg-transparent pr-24");
    expect(source).toContain("w-7 h-7 rounded-full bg-blue-600");
  });

  it("simplifies fairness labels and gives the analyzer more center-column space", () => {
    expect(source).toContain("flex-[0.85] flex flex-col justify-center");
    expect(source).toContain("flex-[1.15] flex flex-col overflow-y-auto");
    expect(source).toContain("<span>Your Favor</span>");
    expect(source).toContain("<span>Their Favor</span>");
    expect(source).not.toContain(">You Give</p>");
    expect(source).not.toContain(">You Receive</p>");
  });

  it("keeps Video Chat states vibrant and visually distinct", () => {
    expect(source).toContain("bg-cyan-500 text-white border-cyan-200");
    expect(source).toContain("bg-emerald-500 text-white border-emerald-300");
    expect(source).toContain("bg-rose-500 text-white border-rose-300");
  });

  it("shows Join Video Chat only for an explicit active caller on the other side", () => {
    expect(source).toContain("const hasOtherMemberActiveVideoCall = Boolean(");
    expect(source).toContain("&& dailyRoomStartedBy");
    expect(source).toContain("String(dailyRoomStartedBy) !== String(myUserId)");
    expect(source).toContain("if (result.joinedExistingCall)");
    expect(source).not.toContain("dailyRoomStartedBy !== myUserId");
  });
});
