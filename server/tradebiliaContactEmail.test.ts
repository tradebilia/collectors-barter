import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveTradebiliaContactEmail } from "./tradebiliaContactEmail";

describe("Tradebilia contact email precedence", () => {
  it("uses only the saved Tradebilia profile contact email", () => {
    expect(resolveTradebiliaContactEmail(" admin@tradebilia.com ")).toBe("admin@tradebilia.com");
    expect(resolveTradebiliaContactEmail(null)).toBe("");
  });

  it("keeps known member-facing workflows off the Manus authentication email", () => {
    const root = process.cwd();
    const files = [
      "client/src/pages/ReportUser.tsx",
      "client/src/pages/ReferralRequest.tsx",
      "client/src/pages/AccountSetup.tsx",
      "client/src/pages/Profile.tsx",
      "client/src/components/DashboardLayout.tsx",
    ];

    for (const file of files) {
      expect(readFileSync(`${root}/${file}`, "utf8")).not.toContain("user?.email");
    }

    const routerSource = readFileSync(`${root}/server/routers.ts`, "utf8");
    expect(routerSource).toContain("getTradebiliaContactIdentity");
    expect(routerSource).not.toContain("ctx.user.email");
  });
});
