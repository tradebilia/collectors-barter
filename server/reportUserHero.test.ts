import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reportUserSource = readFileSync(resolve(process.cwd(), "client/src/pages/ReportUser.tsx"), "utf8");
describe("Report a User hero", () => {
  it("retains the title artwork, readable labels, and account-email default", () => {
    expect(reportUserSource).toContain('REPORT_USER_HERO_TITLE_URL = "/manus-storage/ReportaMember-wide_998d1169.webp"');
    expect(reportUserSource).toContain('REPORT_USER_HERO_BACKGROUND_URL = "/manus-storage/Background_23084d14.jpg"');
    expect(reportUserSource).toContain('const fieldLabelClass = "text-sm font-medium text-slate-100"');
    expect(reportUserSource).toContain('if (!contactEmailEdited && user?.email) setContactEmail(user.email);');
    expect(reportUserSource).toContain('<SharedTopBar hideSearch />');
  });
});
