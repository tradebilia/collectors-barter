import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role ? { id: role === "admin" ? 1 : 2, openId: `health-${role}`, email: `${role}@example.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

describe("Cloudflare storage health report", () => {
  it("does not expose the storage health procedure to unauthenticated or non-admin callers", async () => {
    await expect(appRouter.createCaller(contextFor(null)).r2Media.getStorageHealth()).rejects.toThrow();
    await expect(appRouter.createCaller(contextFor("user")).r2Media.getStorageHealth()).rejects.toThrow();
  });

  it("keeps the report read-only, bounded, and free of object-key fields while surfacing capacity context", () => {
    const source = fs.readFileSync(new URL("./r2StorageHealth.ts", import.meta.url), "utf8");
    expect(source).toContain("ListObjectsV2Command");
    expect(source).toContain("MAX_BUCKET_USAGE_OBJECTS = 10_000");
    expect(source).toContain("R2_STANDARD_FREE_ALLOWANCE_BYTES");
    expect(source).toContain('bucketCapacity: "unlimited"');
    expect(source).toContain("protectedBoundaryIntact");
    expect(source).not.toContain("PutObjectCommand");
    expect(source).not.toContain("DeleteObjectCommand");
  });
});
