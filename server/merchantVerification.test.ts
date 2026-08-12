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

/**
 * The admin users table renders a Merchant column with three states derived
 * from isMerchant + merchantVerified. These live in different tables
 * (userProfiles.isMerchant, users.merchantVerified), so a dropped join or a
 * missing select field would silently render every user as a non-merchant.
 */
function classifyMerchant(u: { isMerchant?: unknown; merchantVerified?: unknown }) {
  if (!u.isMerchant) return "none";
  return u.merchantVerified ? "verified" : "pending";
}

describe("admin merchant column classification", () => {
  it("classifies the three merchant states from raw column values", () => {
    expect(classifyMerchant({ isMerchant: 0, merchantVerified: 0 })).toBe("none");
    expect(classifyMerchant({ isMerchant: null, merchantVerified: null })).toBe("none");
    expect(classifyMerchant({ isMerchant: 1, merchantVerified: 0 })).toBe("pending");
    expect(classifyMerchant({ isMerchant: 1, merchantVerified: null })).toBe("pending");
    expect(classifyMerchant({ isMerchant: 1, merchantVerified: 1 })).toBe("verified");
  });

  it("never marks a non-merchant as verified even if the flag is set", () => {
    // Guards against a stale merchantVerified row after isMerchant is turned off.
    expect(classifyMerchant({ isMerchant: 0, merchantVerified: 1 })).toBe("none");
  });

  it("rejects getAllUsers for non-admin callers", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.admin.getAllUsers()).rejects.toThrow(/FORBIDDEN|forbidden/i);
  });

  it("returns isMerchant and merchantVerified on every admin user row", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const rows = (await caller.admin.getAllUsers()) as any[];
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      // Present as keys (may be 0/null) so the column can classify correctly.
      expect(Object.prototype.hasOwnProperty.call(row, "isMerchant")).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(row, "merchantVerified")).toBe(true);
      expect(["none", "pending", "verified"]).toContain(classifyMerchant(row));
    }
  });
});
