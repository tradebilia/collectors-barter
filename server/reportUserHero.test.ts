import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reportUserSource = readFileSync(resolve(process.cwd(), "client/src/pages/ReportUser.tsx"), "utf8");

describe("Report a User hero", () => {
  it("retains the supplied title artwork over the original collector-background hero", () => {
    expect(reportUserSource).toContain('REPORT_USER_HERO_TITLE_URL = "/manus-storage/ReportaUser_b06c5881.svg"');
    expect(reportUserSource).toContain('REPORT_USER_HERO_BACKGROUND_URL = "/manus-storage/Background_23084d14.jpg"');
    expect(reportUserSource).toContain('alt="Report a User"');
    expect(reportUserSource).toContain('sm:h-72 lg:h-80');
  });

  it("uses readable labels and defaults contact email from the signed-in account without overriding a user edit", () => {
    expect(reportUserSource).toContain('const fieldLabelClass = "text-sm font-medium text-slate-100"');
    expect(reportUserSource).toContain('if (!contactEmailEdited && user?.email) setContactEmail(user.email);');
    expect(reportUserSource).toContain('setContactEmailEdited(true)');
  });
});
