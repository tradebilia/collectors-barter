import { describe, expect, it } from "vitest";
import { getPaymentVerificationObligation, getPaymentVerificationObligations, isAuthorizedPaymentVerification } from "./paymentAuthorization";

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

  it("derives an accepted payer obligation from the proposal rather than browser input", () => {
    const cashTrade = { requesterId: 10, recipientId: 20, status: "accepted", cashFromRequester: "12.50", cashFromRecipient: "0.00" };
    expect(getPaymentVerificationObligation(cashTrade, 10)).toEqual({ payerId: 10, payeeId: 20, amount: 12.5 });
    expect(getPaymentVerificationObligation(cashTrade, 20)).toBeNull();
  });

  it("rejects no-cash, pre-Review, malformed, and outsider payment obligations", () => {
    expect(getPaymentVerificationObligation({ requesterId: 10, recipientId: 20, status: "accepted", cashFromRequester: "0", cashFromRecipient: "0" }, 10)).toBeNull();
    expect(getPaymentVerificationObligation({ requesterId: 10, recipientId: 20, status: "proposed", cashFromRequester: "10", cashFromRecipient: "0" }, 10)).toBeNull();
    expect(getPaymentVerificationObligation({ requesterId: 10, recipientId: 20, status: "shipping", cashFromRequester: "10", cashFromRecipient: "0" }, 10)).toEqual({ payerId: 10, payeeId: 20, amount: 10 });
    expect(getPaymentVerificationObligation({ requesterId: 10, recipientId: 20, status: "accepted", cashFromRequester: "not-a-number", cashFromRecipient: "0" }, 10)).toBeNull();
    expect(getPaymentVerificationObligation({ requesterId: 10, recipientId: 20, status: "accepted", cashFromRequester: "10", cashFromRecipient: "0" }, 99)).toBeNull();
  });

  it("derives both direct-cash obligations when each accepted-trade participant owes cash", () => {
    expect(getPaymentVerificationObligations({ requesterId: 10, recipientId: 20, status: "accepted", cashFromRequester: "270", cashFromRecipient: "25" })).toEqual([
      { payerId: 10, payeeId: 20, amount: 270 },
      { payerId: 20, payeeId: 10, amount: 25 },
    ]);
  });
});
