import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const pageSource = fs.readFileSync(
  path.resolve(process.cwd(), "client/src/pages/ReportUser.tsx"),
  "utf8",
);

describe("Report a User navigation", () => {
  it("places View My Reports in the card header near the introduction", () => {
    const descriptionEnd = pageSource.indexOf("</CardDescription>");
    const headerEnd = pageSource.indexOf("</CardHeader>");
    const header = pageSource.slice(descriptionEnd, headerEnd);

    expect(descriptionEnd).toBeGreaterThan(-1);
    expect(headerEnd).toBeGreaterThan(descriptionEnd);
    expect(header).toContain('href="/my-reports"');
    expect(header).toContain("View My Reports");
    expect(header).toContain("FileText");
  });

  it("keeps the primary form action focused on submitting the report", () => {
    const formAction = pageSource.slice(pageSource.indexOf('type="submit"'), pageSource.indexOf("</form>"));
    expect(formAction).toContain("Submit report");
    expect(formAction).not.toContain('href="/my-reports"');
  });
});

export {};
