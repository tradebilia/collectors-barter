import { describe, expect, it } from "vitest";
import { getAvailableExternalPaymentMethods } from "./externalPaymentMethods";

describe("Trade Room saved payment-method availability", () => {
  it("returns only Venmo when Venmo is the only saved destination", () => {
    expect(getAvailableExternalPaymentMethods({ venmoUsername: "collector_rich" })).toEqual([
      { method: "venmo", label: "Venmo", identifier: "•••@collector_rich" },
    ]);
  });

  it("omits empty destinations and preserves every populated method", () => {
    expect(getAvailableExternalPaymentMethods({
      paypalEmail: "member@example.com",
      cashAppCashtag: "$collector123",
      zelleEmail: "zelle@example.com",
      venmoUsername: null,
    })).toEqual([
      { method: "paypal", label: "PayPal", identifier: "m•••@example.com" },
      { method: "cash_app", label: "Cash App", identifier: "$c•••23" },
      { method: "zelle", label: "Zelle", identifier: "z•••@example.com" },
    ]);
  });

  it("returns no selectable methods when no destination is saved", () => {
    expect(getAvailableExternalPaymentMethods({})).toEqual([]);
  });
});
