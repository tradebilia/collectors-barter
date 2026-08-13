import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(join(process.cwd(), "client", "src", "pages", "Home.tsx"), "utf-8");
const messagesSource = readFileSync(join(process.cwd(), "client", "src", "pages", "Messages.tsx"), "utf-8");
const memberDirectorySource = readFileSync(join(process.cwd(), "client", "src", "pages", "MemberSearch.tsx"), "utf-8");
const appSource = readFileSync(join(process.cwd(), "client", "src", "App.tsx"), "utf-8");

describe("Member Directory navigation", () => {
  it("places Member Directory in the homepage subscriber-tools panel", () => {
    expect(homeSource).toContain("Member Directory");
    expect(homeSource).toContain("setLocation('/members')");
  });

  it("stacks the Subscriber Tools panel above homepage content on mobile", () => {
    expect(homeSource).toContain("grid-cols-1 gap-0 md:grid-cols-[200px_minmax(0,1fr)]");
    expect(homeSource).toContain("md:col-start-1 md:row-span-2");
  });

  it("removes the Member Directory button from the direct-message composer", () => {
    expect(messagesSource).not.toContain("Member directory");
    expect(messagesSource).not.toContain("UsersRound");
  });

  it("removes the duplicate Verified Merchants homepage action while retaining directory verification filtering", () => {
    expect(homeSource).not.toContain("setLocation('/verified-merchants')");
    expect(memberDirectorySource).toContain('value="verified"');
  });

  it("keeps the directory publicly viewable while reserving member actions for authenticated users", () => {
    expect(appSource).toContain('<Route path="/members" component={MemberSearch} />');
    expect(memberDirectorySource).toContain("if (!isAuthenticated)");
  });
});
