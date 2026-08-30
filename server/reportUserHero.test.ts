import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reportUserSource = readFileSync(resolve(process.cwd(), "client/src/pages/ReportUser.tsx"), "utf8");

describe("Report a User hero", () => {
  it("retains the supplied title artwork over the original collector-background hero", () => {
    expect(reportUserSource).toContain('REPORT_USER_HERO_TITLE_URL = "https://assets.tradebilia.com/ReportaMember-wide_998d1169.webp"');
    expect(reportUserSource).toContain('REPORT_USER_HERO_BACKGROUND_URL = "https://assets.tradebilia.com/Background_23084d14.jpg"');
    expect(reportUserSource).toContain('max-w-7xl items-center justify-center');
    expect(reportUserSource).not.toContain('-ml-32');
    expect(reportUserSource).not.toContain('reportUserMobileHero');
    expect(reportUserSource).toContain('alt="Report a Member"');
    expect(reportUserSource).toContain('sm:h-72 lg:h-80');
    expect(reportUserSource).toContain("<TopBar hideSearch />");
  });

  it("uses readable labels and resets Contact email for a new signed-in account without overriding a same-account user edit", () => {
    expect(reportUserSource).toContain('const fieldLabelClass = "text-sm font-medium text-slate-100"');
    expect(reportUserSource).toContain('const contactEmailAccountId = useRef<number | null>(null);');
    expect(reportUserSource).toContain('trpc.market.contactIdentity.useQuery');
    expect(reportUserSource).toContain('if (contactEmailAccountId.current !== account.userId)');
    expect(reportUserSource).toContain('setContactEmail(account.contactEmail);');
    expect(reportUserSource).not.toContain('user.email');
    expect(reportUserSource).toContain('setContactEmailEdited(true)');
  });

  it("supports accessible drag-and-drop evidence uploads while retaining the browse-file path", () => {
    expect(reportUserSource).toContain("const evidenceInputRef = useRef<HTMLInputElement>(null);");
    expect(reportUserSource).toContain("const handleEvidenceDrop =");
    expect(reportUserSource).toContain("Array.from(event.dataTransfer.files)");
    expect(reportUserSource).toContain('role="button"');
    expect(reportUserSource).toContain("onKeyDown={handleEvidenceDropzoneKeyDown}");
    expect(reportUserSource).toContain("Drop evidence here or click to browse");
    expect(reportUserSource).toContain("evidenceInputRef.current?.click()");
  });
});
