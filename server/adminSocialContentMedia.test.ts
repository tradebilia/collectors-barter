import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const uploadSection = routerSource.slice(
  routerSource.indexOf("uploadSocialContentMedia:"),
  routerSource.indexOf("getPromotionOpportunities:"),
);

describe("admin social-content media upload contract", () => {
  it("requires an administrator and stores uploads through the configured object storage helper", () => {
    expect(uploadSection).toContain('ctx.user.role !== "admin"');
    expect(uploadSection).toContain("storagePut(");
    expect(uploadSection).toContain("social-content/admin-");
  });

  it("restricts uploads to approved media types and a six-megabyte binary limit", () => {
    expect(uploadSection).toContain('"image/jpeg"');
    expect(uploadSection).toContain('"video/mp4"');
    expect(uploadSection).toContain("6 * 1024 * 1024");
    expect(uploadSection).toContain("PAYLOAD_TOO_LARGE");
  });
});
