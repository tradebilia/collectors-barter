import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const adminSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");
const tabSource = fs.readFileSync(path.join(projectRoot, "client/src/components/PreLaunchEmailTab.tsx"), "utf8");
const routerSource = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf8");

describe("Pre-Launch Email administration", () => {
  it("adds the email workspace to the Admin Dashboard", () => {
    expect(adminSource).toContain('value="pre-launch-email"');
    expect(adminSource).toContain("Pre-Launch Email");
    expect(adminSource).toContain("<PreLaunchEmailTab />");
  });

  it("shows opted-in recipients and requires an explicit send confirmation", () => {
    expect(tabSource).toContain("getPreLaunchRecipients.useQuery");
    expect(tabSource).toContain("Review &amp; Send to");
    expect(tabSource).toContain("Send this Pre-Launch Email?");
    expect(tabSource).toContain("sendPreLaunchUpdate.useMutation");
  });

  it("protects recipient access and delivery behind admin-only procedures", () => {
    expect(routerSource).toContain("getPreLaunchRecipients: protectedProcedure");
    expect(routerSource).toContain("sendPreLaunchUpdate: protectedProcedure");
    expect(routerSource).toContain("Only admins can send Pre-Launch Email updates");
  });
});
