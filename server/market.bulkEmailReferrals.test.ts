import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedAdmin = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const admin: AuthenticatedAdmin = {
    id: 1,
    openId: "admin-user",
    email: "admin@test.local",
    name: "Admin User",
    loginMethod: "password",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: admin,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedAdmin = {
    id: 2,
    openId: "regular-user",
    email: "user@test.local",
    name: "Regular User",
    loginMethod: "password",
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
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Bulk Email Referrals", () => {
  it("should reject non-admin users from sending bulk emails", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.admin.sendBulkEmailToReferrals({
        referralIds: [1],
        subject: "Test",
        message: "Test message",
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should reject empty referral IDs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.admin.sendBulkEmailToReferrals({
        referralIds: [],
        subject: "Test",
        message: "Test message",
      });
      expect.fail("Should have thrown NOT_FOUND error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("should reject invalid referral IDs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.admin.sendBulkEmailToReferrals({
        referralIds: [99999],
        subject: "Test",
        message: "Test message",
      });
      expect.fail("Should have thrown NOT_FOUND error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("should reject non-admin users from deleting referrals", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.admin.deleteReferral({
        referralId: 1,
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should reject non-admin users from marking referrals as joined", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.admin.removeReferralByEmail({
        referralId: 1,
        userId: 1,
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
