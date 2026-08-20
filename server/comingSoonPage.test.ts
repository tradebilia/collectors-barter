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
    expect(pageSource).toContain('<AnimatedLogoSmall70 fontSize={125} wordmarkColor="#211b17" neutralCategoryColor="#211b17" wheelScale={1.18} />');
    expect(pageSource).toContain('tradebilia-coming-soon-restoration-workbench-bg_4d7c4648.png');
    expect(pageSource).toContain('className="mx-auto h-20 w-full max-w-[34rem] sm:h-28"');
    expect(pageSource).not.toContain("Background_23084d14.jpg");
    expect(pageSource).toContain("Every collection has a next chapter.");
    expect(pageSource).toContain("The Collectors Trading Exchange.");
    expect(pageSource).toContain("all ten collector categories");
    expect(pageSource).toContain("Receive launch updates");
    expect(pageSource).toContain("Yes, I&apos;d like to receive updates");
    expect(pageSource).toContain('className="grid grid-cols-5 sm:grid-cols-10"');
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
    expect(adminSource).toContain('value="pre-launch-email"');
    expect(adminSource).toContain("Pre-Launch Email");
  });
});
