import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("market.saveCommunications", () => {
  it("should save communication preferences with email and text toggles", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const prefs = {
      tradeInitiated: { email: true, text: false },
      counterProposal: { email: true, text: true },
      proposalAccepted: { email: false, text: true },
      proposalRejected: { email: true, text: false },
      itemsShipped: { email: true, text: true },
      itemsReceived: { email: true, text: true },
      feedbackReceived: { email: false, text: false },
      systemUpdates: { email: true, text: false },
      marketingEmails: { email: false, text: true },
    };

    const result = await caller.market.saveCommunications(prefs);
    expect(result).toEqual({ success: true });
  });

  it("should save preferences with all toggles enabled", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    const prefs = {
      tradeInitiated: { email: true, text: true },
      counterProposal: { email: true, text: true },
      proposalAccepted: { email: true, text: true },
      proposalRejected: { email: true, text: true },
      itemsShipped: { email: true, text: true },
      itemsReceived: { email: true, text: true },
      feedbackReceived: { email: true, text: true },
      systemUpdates: { email: true, text: true },
      marketingEmails: { email: true, text: true },
    };

    const result = await caller.market.saveCommunications(prefs);
    expect(result).toEqual({ success: true });
  });

  it("should save preferences with all toggles disabled", async () => {
    const ctx = createAuthContext(3);
    const caller = appRouter.createCaller(ctx);

    const prefs = {
      tradeInitiated: { email: false, text: false },
      counterProposal: { email: false, text: false },
      proposalAccepted: { email: false, text: false },
      proposalRejected: { email: false, text: false },
      itemsShipped: { email: false, text: false },
      itemsReceived: { email: false, text: false },
      feedbackReceived: { email: false, text: false },
      systemUpdates: { email: false, text: false },
      marketingEmails: { email: false, text: false },
    };

    const result = await caller.market.saveCommunications(prefs);
    expect(result).toEqual({ success: true });
  });

  it("should reject invalid input with missing fields", async () => {
    const ctx = createAuthContext(4);
    const caller = appRouter.createCaller(ctx);

    const invalidPrefs = {
      tradeInitiated: { email: true, text: false },
      // Missing other required fields
    };

    try {
      await caller.market.saveCommunications(invalidPrefs as any);
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("counterProposal");
    }
  });

  it("should reject invalid input with malformed nested objects", async () => {
    const ctx = createAuthContext(5);
    const caller = appRouter.createCaller(ctx);

    const invalidPrefs = {
      tradeInitiated: { email: "yes", text: false }, // email should be boolean
      counterProposal: { email: true, text: true },
      proposalAccepted: { email: true, text: true },
      proposalRejected: { email: true, text: true },
      itemsShipped: { email: true, text: true },
      itemsReceived: { email: true, text: true },
      feedbackReceived: { email: true, text: true },
      systemUpdates: { email: true, text: true },
      marketingEmails: { email: true, text: true },
    };

    try {
      await caller.market.saveCommunications(invalidPrefs as any);
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("boolean");
    }
  });
});
