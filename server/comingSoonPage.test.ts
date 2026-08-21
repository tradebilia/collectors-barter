import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pageSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ComingSoon.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");
const adminSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("Coming Soon experience", () => {
  it("uses the animated Tradebilia logo and has an opt-in email form", () => {
    expect(pageSource).toContain('import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70"');
    expect(pageSource).toContain('<AnimatedLogoSmall70 fontSize={146} wheelScale={1.7} wheelOffsetX={-34} dividerScale={1.15} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" wheelStrokeWidth={6} dividerStrokeWidth={3.6} fixedCategoryMetrics centerLockup centeredViewBoxWidth={2200} />');
    expect(pageSource).toContain('tradebilia-coming-soon-dense-category-workbench-caption-free_614a7212.png');
    expect(pageSource).not.toContain('tradebilia-coming-soon-dense-category-workbench_c64ac671.png');
    expect(pageSource).toContain('className="mx-auto h-20 w-full max-w-[25rem] sm:h-24 sm:max-w-[38rem]"');
    expect(pageSource).not.toContain("Background_23084d14.jpg");
    expect(pageSource).toContain("Every collection<br />has a next chapter.");
    expect(pageSource).toContain("The Collectors Trading Exchange");
    expect(pageSource).toContain("all ten collector categories");
    expect(pageSource).toContain('"Notify me"');
    expect(pageSource).toContain("Yes, I&apos;d like to receive launch updates");
    expect(pageSource).toContain('aria-label="Collections on the exchange"');
    expect(pageSource).toContain('border-y border-[#6c503c]/20 py-2');
    expect(pageSource).toContain('sm:grid-cols-5');
    expect(pageSource).toContain("<span>Vintage Toys</span>");
    expect(pageSource).toContain("<span>Disney Pins</span>");
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
