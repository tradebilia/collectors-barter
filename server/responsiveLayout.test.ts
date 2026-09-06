import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const readPage = (name: string) => fs.readFileSync(path.join(projectRoot, `client/src/pages/${name}.tsx`), "utf8");

describe("responsive viewport layout contracts", () => {
  it("uses width-aware hero sizing on Messages and My Inventory", () => {
    expect(readPage("Messages")).toContain("h-[clamp(16rem,32vw,25rem)]");
    expect(readPage("Inventory")).toContain("h-[clamp(16rem,32vw,25rem)]");
  });

  it("lets Messages communication panels grow with their content instead of locking them to viewport height", () => {
    const messagesSource = readPage("Messages");
    expect(messagesSource).toContain('<div className="flex min-h-[34rem] flex-col">');
    expect(messagesSource).not.toContain('sm:h-[70vh] sm:min-h-0');
  });

  it("bounds Trade Room modal height to the available dynamic viewport while retaining internal scrolling", () => {
    const warRoomSource = readPage("WarRoom");
    expect(warRoomSource).toContain("h-[min(85dvh,52rem)] max-h-[calc(100dvh-2rem)]");
    expect(warRoomSource).toContain("h-[min(90dvh,52rem)] max-h-[calc(100dvh-2rem)]");
    expect(warRoomSource).not.toContain("style={{ height: '85vh' }}");
    expect(warRoomSource).not.toContain("style={{ height: '90vh' }}");
  });

  it("keeps the Trade Hub hero and category bar aligned with the homepage", () => {
    const homeSource = readPage("Home");
    const tradeHubSource = readPage("TradeHub");
    expect(homeSource).toContain('className="container relative flex h-[400px] items-center justify-center py-0"');
    expect(tradeHubSource).toContain('className="container relative flex h-[400px] items-center justify-center py-0"');
    expect(tradeHubSource.indexOf("</section>\n\n        <CategoryBar />")).toBeGreaterThan(-1);
  });
});
