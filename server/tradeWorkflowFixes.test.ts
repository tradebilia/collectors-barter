import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const itemDetailSource = read("client/src/pages/ItemDetail.tsx");
const tradeHubSource = read("client/src/pages/TradeHub.tsx");
const topRightIconsSource = read("client/src/components/TopRightIcons.tsx");
const warRoomSource = read("client/src/pages/WarRoom.tsx");
const tradeFlowSource = read("server/tradeFlowRouter.ts");
const listingDetailSource = read("server/db.ts");
const paymentRouterSource = read("server/routers.ts");

describe("requested trade workflow repairs", () => {
  it("prevents repeat proposals in both the persisted listing state and the authoritative mutation", () => {
    expect(listingDetailSource).toContain("viewerActiveTradeRows");
    expect(listingDetailSource).toContain("viewerActiveTrade:");
    expect(tradeFlowSource).toContain("ACTIVE_PROPOSAL_STATUSES");
    expect(tradeFlowSource).toContain("A trade proposal for this item is already in progress");
    expect(itemDetailSource).toContain("hasActiveTradeForListing");
    expect(itemDetailSource).toContain("disabled={createProposalMutation.isPending || isOwnListing || hasActiveTradeForListing}");
    expect(itemDetailSource).toContain("Continue it from Trade Hub");
  });

  it("routes bell alerts to their unread folder and visually marks every unread folder", () => {
    expect(tradeFlowSource).toContain("getUnreadTradeAlertFolders");
    expect(topRightIconsSource).toContain("tradeHubHref");
    expect(topRightIconsSource).toContain("/trade-hub?folder=");
    expect(tradeHubSource).toContain("tradeFolderFromLocation");
    expect(tradeHubSource).toContain("Check {folderLabels[primaryUnreadFolder]}");
    expect(tradeHubSource).toContain("folderUnreadCount > 0");
  });

  it("shows cash method and payer-only payment ID in shipping information and preserves those details in a completed recap", () => {
    expect(warRoomSource).toContain('data-testid="shipping-payment-details"');
    expect(warRoomSource).toContain("Cash payment details");
    expect(warRoomSource).toContain("Payment method");
    expect(warRoomSource).toContain("Payment ID");
    expect(warRoomSource).toContain("Visible only to the member sending this cash.");
    const context = paymentRouterSource.slice(paymentRouterSource.indexOf("getCashAdjustmentContext:"), paymentRouterSource.indexOf("selectCashAdjustmentMethod:", paymentRouterSource.indexOf("getCashAdjustmentContext:")));
    expect(context).toContain('"completed"');
    expect(context).toContain("obligation.payerId === ctx.user.id ? payment.paymentIdentifier : null");
  });

  it("renders full carrier status facts and every returned scan through completion", () => {
    expect(warRoomSource).toContain('data-testid="full-tracking-details"');
    expect(warRoomSource).toContain("Complete carrier scan history");
    expect(warRoomSource).toContain("Carrier service");
    expect(warRoomSource).toContain("Recorded scans");
    expect(warRoomSource).toContain("['shipped', 'review', 'completed'].includes(currentStage)");
  });

  it("places Step 6 review before fulfillment details and labels completed trade actions as recaps", () => {
    const reviewPanelIndex = warRoomSource.indexOf("const reviewPanel");
    const tradeSummaryIndex = warRoomSource.indexOf("{/* Trade Summary Card");
    expect(reviewPanelIndex).toBeGreaterThan(-1);
    expect(tradeSummaryIndex).toBeGreaterThan(reviewPanelIndex);
    expect(warRoomSource).toContain("Step 6 is intentionally first");
    expect(tradeHubSource).toContain("See Trade Recap");
    expect(tradeHubSource).toContain("View the completed exchange, fulfillment record, and feedback");
  });
});
