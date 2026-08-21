import { describe, expect, it } from "vitest";
import {
  canAccessPrivateReportEvidence,
  getPrivateReportEvidenceOwnerId,
} from "./_core/storageProxy";

describe("private report evidence proxy authorization", () => {
  it("recognizes only canonical report-evidence paths as private", () => {
    expect(getPrivateReportEvidenceOwnerId("reports/42/evidence.png")).toBe(42);
    expect(getPrivateReportEvidenceOwnerId("listings/42/photo.png")).toBeNull();
    expect(getPrivateReportEvidenceOwnerId("reports/not-a-user/evidence.png")).toBeNull();
  });

  it("allows only the evidence owner or an administrator", () => {
    expect(canAccessPrivateReportEvidence({ id: 42, role: "user" }, 42)).toBe(true);
    expect(canAccessPrivateReportEvidence({ id: 7, role: "admin" }, 42)).toBe(true);
    expect(canAccessPrivateReportEvidence({ id: 7, role: "user" }, 42)).toBe(false);
    expect(canAccessPrivateReportEvidence(null, 42)).toBe(false);
  });
});
