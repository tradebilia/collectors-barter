import { describe, expect, it } from "vitest";
import { hasTrackingForEveryItem, haveAllCashPaymentsBeenReceived, haveAllCashPaymentsBeenSent, haveAllRequiredItemRecipientsConfirmed } from "./tradeFulfillment";

describe("Trade fulfillment safeguards", () => {
  const twoWayCash = [{ payerId: 10, payeeId: 20, amount: 50 }, { payerId: 20, payeeId: 10, amount: 25 }];

  it("requires tracking for every included physical item but requires none for a cash-only agreement", () => {
    expect(hasTrackingForEveryItem([101, 102], [101])).toBe(false);
    expect(hasTrackingForEveryItem([101, 102], [102, 101])).toBe(true);
    expect(hasTrackingForEveryItem([], [])).toBe(true);
  });

  it("opens Step 5 after every direct cash payer marks sent, without treating sent as receipt", () => {
    expect(haveAllCashPaymentsBeenSent(twoWayCash, [{ payerId: 10, status: "sent" }, { payerId: 20, status: "method_selected" }])).toBe(false);
    expect(haveAllCashPaymentsBeenSent(twoWayCash, [{ payerId: 10, status: "sent" }, { payerId: 20, status: "sent" }])).toBe(true);
    expect(haveAllCashPaymentsBeenReceived(twoWayCash, [{ payerId: 10, status: "sent" }, { payerId: 20, status: "sent" }])).toBe(false);
  });

  it("requires every cash receipt and every member expecting a physical item before completion", () => {
    expect(haveAllCashPaymentsBeenReceived(twoWayCash, [{ payerId: 10, status: "received" }, { payerId: 20, status: "verified" }])).toBe(true);
    expect(haveAllRequiredItemRecipientsConfirmed([10, 20], [10])).toBe(false);
    expect(haveAllRequiredItemRecipientsConfirmed([10, 20], [20, 10])).toBe(true);
    expect(haveAllRequiredItemRecipientsConfirmed([], [])).toBe(true);
  });
});
