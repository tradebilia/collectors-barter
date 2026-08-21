import { describe, expect, it } from "vitest";
import { isAuthorizedPaymentVerification } from "./paymentAuthorization";

describe("payment verification authorization", () => {
  const proposal = { requesterId: 10, recipientId: 20 };

  it("allows either proposal participant to verify payment to the counterparty", () => {
    expect(isAuthorizedPaymentVerification(proposal, 10, 20)).toBe(true);
    expect(isAuthorizedPaymentVerification(proposal, 20, 10)).toBe(true);
  });

  it("rejects outsiders, invalid payees, and self-payment", () => {
    expect(isAuthorizedPaymentVerification(proposal, 99, 20)).toBe(false);
    expect(isAuthorizedPaymentVerification(proposal, 10, 99)).toBe(false);
    expect(isAuthorizedPaymentVerification(proposal, 10, 10)).toBe(false);
  });
});
