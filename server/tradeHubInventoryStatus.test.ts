import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tradeHubSource = readFileSync(
  new URL("../client/src/pages/TradeHub.tsx", import.meta.url),
  "utf8",
);
const inventorySource = readFileSync(
  new URL("../client/src/pages/Inventory.tsx", import.meta.url),
  "utf8",
);

describe("Trade Hub and Inventory status presentation", () => {
  it("keeps the completed count inline, centered, and typographically controlled", () => {
    expect(tradeHubSource).toContain("inline-flex h-6 min-w-7 shrink-0 items-center justify-center");
    expect(tradeHubSource).toContain("font-sans text-[13px] font-semibold leading-none");
    expect(tradeHubSource).toContain("folderLabels[activeFolder]");
  });

  it("keeps the Trade Hub dark background through the viewport root", () => {
    expect(tradeHubSource).toContain('<div className="min-h-screen bg-[#0a0a2a] text-foreground">');
  });

  it("uses a trade-appropriate icon for the Enter Trade Room action", () => {
    expect(tradeHubSource).toContain('import { ArrowLeftRight, Mail } from "lucide-react";');
    expect(tradeHubSource).toContain("<ArrowLeftRight className=");
    expect(tradeHubSource).not.toContain("⚔️ Enter Trade Room");
  });

  it("offers distinct Active, Not Listed, and Traded inventory filters", () => {
    expect(inventorySource).toContain('<SelectItem value="active">Active</SelectItem>');
    expect(inventorySource).toContain('<SelectItem value="not-listed">Not Listed</SelectItem>');
    expect(inventorySource).toContain('<SelectItem value="traded">Traded</SelectItem>');
    expect(inventorySource).toContain('(status === "active" && listing.status !== "traded" && Boolean(listing.isActive))');
    expect(inventorySource).toContain('(status === "not-listed" && listing.status !== "traded" && !listing.isActive)');
    expect(inventorySource).toContain('(status === "traded" && listing.status === "traded")');
  });
});

// This suite intentionally checks source contracts only; it does not seed or mutate inventory data.
