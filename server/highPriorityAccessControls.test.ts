import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("high-priority access-control regressions", () => {
  it("keeps pending conventions behind an authenticated administrator check", () => {
    const routers = source("server/routers.ts");
    expect(routers).toMatch(/pending:\s*protectedProcedure[\s\S]{0,300}ctx\.user\.role !== 'admin'/);
  });

  it("checks trade participants before payment-verification provider work", () => {
    const routers = source("server/routers.ts");
    const paymentSection = routers.slice(routers.indexOf("verifyPayment: protectedProcedure"));
    expect(paymentSection.indexOf("isAuthorizedPaymentVerification")).toBeGreaterThan(-1);
    expect(paymentSection.indexOf("isAuthorizedPaymentVerification")).toBeLessThan(paymentSection.indexOf("verifyPayPalTransaction"));
  });

  it("checks private report-evidence ownership before requesting a storage presign", () => {
    const proxy = source("server/_core/storageProxy.ts");
    expect(proxy.indexOf("canAccessPrivateReportEvidence")).toBeLessThan(proxy.indexOf("v1/storage/presign/get"));
  });
});
