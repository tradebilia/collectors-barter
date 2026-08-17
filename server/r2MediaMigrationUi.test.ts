import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

describe("R2 public-media migration safeguards", () => {
  it("keeps the server migration route admin-only, confirmation-gated, and capped at five records", () => {
    const source = fs.readFileSync(path.join(root, "server/r2MediaRouter.ts"), "utf8");
    expect(source).toContain('role !== "admin"');
    expect(source).toContain('z.literal("MIGRATE_PUBLIC_MEDIA")');
    expect(source).toContain('z.literal("RESTORE_LEGACY_MEDIA_URLS")');
    expect(source).toContain("max(5)");
    expect(source).toContain("verifyR2PublicMediaObject");
    expect(source).toContain("legacyKey");
  });

  it("states the public/private scope accurately in the administrator control", () => {
    const source = fs.readFileSync(path.join(root, "client/src/components/R2MediaMigrationTab.tsx"), "utf8");
    expect(source).toContain("private report evidence and static artwork are excluded");
    expect(source).toContain("Migrate next batch of up to 5");
    expect(source).toContain("Restore migrated legacy URLs");
    expect(source).toContain("administrator-only");
  });
});
