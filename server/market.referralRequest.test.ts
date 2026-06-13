import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "password",
    role,
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
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Referral Request Procedures", () => {
  describe("submitReferralRequest", () => {
    it("should successfully submit a referral request with valid data", async () => {
      const ctx = createUserContext("user");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.market.referralRequest({
        friendName: "John Collector",
        friendEmail: "john@example.com",
        collectorFocus: "Sports Cards",
        message: "This is a great collector who should join Tradebilia. They have an amazing collection.",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain("referral request");
    });

    it("should reject referral request with invalid email", async () => {
      const ctx = createUserContext("user");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.market.referralRequest({
          friendName: "John Collector",
          friendEmail: "invalid-email",
          collectorFocus: "Sports Cards",
          message: "This is a great collector who should join Tradebilia. They have an amazing collection.",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("should reject referral request with short name", async () => {
      const ctx = createUserContext("user");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.market.referralRequest({
          friendName: "J",
          friendEmail: "john@example.com",
          collectorFocus: "Sports Cards",
          message: "This is a great collector who should join Tradebilia. They have an amazing collection.",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("should reject referral request with short message", async () => {
      const ctx = createUserContext("user");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.market.referralRequest({
          friendName: "John Collector",
          friendEmail: "john@example.com",
          collectorFocus: "Sports Cards",
          message: "Too short",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("Admin Referral Management", () => {
    it("should allow admin to fetch all referrals", async () => {
      const ctx = createUserContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getAllReferrals();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should reject non-admin from fetching referrals", async () => {
      const ctx = createUserContext("user");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.admin.getAllReferrals();
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should reject non-admin from updating referral status", async () => {
      const ctx = createUserContext("user");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.admin.updateReferralStatus({
          referralId: 1,
          status: "approved",
          adminNotes: "Test",
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });
});
