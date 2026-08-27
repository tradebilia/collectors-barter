import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const adminDashboardPath = path.resolve(import.meta.dirname, "../client/src/pages/AdminDashboard.tsx");

describe("Admin Billing monitoring controls", () => {
  it("provides semantic Membership status and billing-term sorting controls", async () => {
    const source = await readFile(adminDashboardPath, "utf8");
    expect(source).toContain("sortBillingMembers");
    expect(source).toContain("MEMBERSHIP_STATUS_SORT_ORDER");
    expect(source).toContain("MEMBERSHIP_TERM_SORT_ORDER");
    expect(source).toContain("billingSortBy");
    expect(source).toContain('value="status"');
    expect(source).toContain('value="term"');
    expect(source).toContain("sortedBillingMembers.map");
  });
});
