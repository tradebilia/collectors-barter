import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pageSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ComingSoon.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");
const adminSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("Coming Soon experience", () => {
  it("uses the established animated logo and has an opt-in email form", () => {
    expect(pageSource).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70"');
    expect(pageSource).toContain("<AnimatedLogoSmall70 />");
    expect(pageSource).toContain('className="mb-8 w-full sm:mb-12"');
    expect(pageSource).toContain('className="w-[160%] max-w-none"');
    expect(pageSource).toContain("I agree to receive Tradebilia launch updates");
    expect(pageSource).toContain("trpc.launchUpdates.subscribe.useMutation");
    expect(pageSource).not.toContain("TradebiliaWheel");
    expect(pageSource).not.toContain("A new collector exchange is taking shape");
    expect(pageSource).not.toContain("Your email is used only for the launch update list.");
    expect(pageSource).not.toContain('href="/privacy"');
  });

  it("registers the preview route and makes it available from the Admin Dashboard", () => {
    expect(appSource).toContain('import ComingSoon from "./pages/ComingSoon"');
    expect(appSource).toContain('<Route path="/coming-soon" component={ComingSoon} />');
    expect(adminSource).toContain('href="/coming-soon"');
    expect(adminSource).toContain("Coming Soon Preview");
  });
});
