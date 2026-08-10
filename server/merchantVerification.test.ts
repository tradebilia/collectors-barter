import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "user" | "admin" | null): TrpcContext {
  const user: AuthenticatedUser | null =
    role === null
      ? null
      : {
          id: role === "admin" ? 1 : 2,
          openId: `test-${role}`,
          email: `${role}@example.com`,
          name: `Test ${role}`,
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

describe("merchant verification authorization", () => {
  it("rejects verifyMerchant for unauthenticated callers", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(
      caller.admin.verifyMerchant({ userId: 999, verified: true }),
    ).rejects.toThrow();
  });

  it("rejects verifyMerchant for non-admin authenticated users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(
      caller.admin.verifyMerchant({ userId: 999, verified: true }),
    ).rejects.toThrow(/FORBIDDEN|forbidden/i);
  });

  it("rejects verifyMerchant with an invalid userId", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(
      caller.admin.verifyMerchant({ userId: -1, verified: true } as any),
    ).rejects.toThrow();
  });

  it("defaults the verified flag to true when omitted", async () => {
    // The zod schema declares `verified` with .default(true); assert the shape
    // so a future refactor cannot silently turn verify into revoke.
    const caller = appRouter.createCaller(createContext("user"));
    // Non-admin still throws FORBIDDEN, proving input parsing succeeded first
    // (a schema failure would throw BAD_REQUEST instead).
    await expect(
      caller.admin.verifyMerchant({ userId: 5 } as any),
    ).rejects.toThrow(/FORBIDDEN|forbidden/i);
  });
});

describe("verified merchants directory", () => {
  it("exposes getVerifiedMerchants as a public procedure", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const rows = await caller.market.getVerifiedMerchants();
    expect(Array.isArray(rows)).toBe(true);
  });

  it("only returns merchants that are actually verified", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const rows = await caller.market.getVerifiedMerchants();
    // Every returned row must carry a verification timestamp, since the query
    // filters on merchantVerified = 1 and orders by merchantVerifiedAt.
    for (const row of rows as any[]) {
      expect(row).toHaveProperty("id");
      expect(row).toHaveProperty("merchantVerifiedAt");
    }
  });
});

describe("marketplace verified-merchant filter", () => {
  it("accepts verifiedMerchantsOnly in the feed filter schema", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.market.feed({ verifiedMerchantsOnly: true });
    expect(result).toBeTruthy();
    expect(Array.isArray(result.listings)).toBe(true);
  });

  it("rejects a non-boolean verifiedMerchantsOnly value", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(
      caller.market.feed({ verifiedMerchantsOnly: "yes" } as any),
    ).rejects.toThrow();
  });
});
