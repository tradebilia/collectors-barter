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
    expect(pageSource).toContain('<AnimatedLogoSmall70 fontSize={196} wheelScale={2.24} wheelOffsetX={-65} wheelOffsetY={-30} dividerScale={1.55} dividerOffsetY={-20} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" categoryColorOverrides={COMING_SOON_CATEGORY_COLORS} wheelColors={COMING_SOON_WHEEL_COLORS} wheelStrokeWidth={6} dividerStrokeWidth={3.6} fixedCategoryMetrics centerLockup centeredViewBoxWidth={3000} canvasWidthScale={1} />');
    expect(pageSource).toContain('tradebilia-coming-soon-scattered-mixed-grade-workbench-extra-wide-parchment_9f77d258.png');
    expect(pageSource).toContain('COMING_SOON_CATEGORY_COLORS');
    expect(pageSource).toContain('COMICS: "#6f3b9e"');
    expect(pageSource).toContain('"SPORTS CARDS": "#b0221a"');
    expect(pageSource).toContain('const COMING_SOON_WHEEL_COLORS = [');
    expect(pageSource).not.toContain('tradebilia-coming-soon-dense-category-workbench_c64ac671.png');
    expect(pageSource).toContain('className="mx-auto h-24 w-full max-w-[34rem] translate-y-20 overflow-hidden px-2 sm:h-28 sm:max-w-[42rem] sm:translate-y-24 sm:px-4"');
    expect(pageSource).not.toContain("Collector&apos;s Workbench");
    expect(pageSource).toContain('className="translate-y-0 pt-12 sm:-translate-y-1 sm:pt-8"');
    expect(pageSource).toContain('className="mx-auto mt-2 max-w-md sm:mt-3"');
    expect(pageSource).toContain('<div className="relative">');
    expect(pageSource).toContain('role="alert" aria-live="polite" className="absolute inset-x-0 top-full mt-3');
    expect(pageSource).toContain('/invalid email|invalid_format/i.test(subscribeMutation.error.message)');
    expect(pageSource).toContain('"Please enter a valid email address."');
    expect(pageSource).toContain('"We could not save your email right now. Please try again later."');
    expect(pageSource).toContain('className={submitted ? "invisible" : undefined}');
    expect(pageSource).toContain('role="status" aria-live="polite" className="absolute inset-x-0 top-0');
    expect(pageSource).not.toContain("Background_23084d14.jpg");
    expect(pageSource).toContain("Why Buy or Sell<br />When You Can Trade?");
    expect(pageSource).toContain("The Collectors Trading Exchange");
    expect(pageSource).toContain("A home for remarkable collectibles—and the collectors who know their worth.");
    expect(pageSource).toContain("Free for collectors.");
    expect(pageSource).toContain("No money is taken to complete a trade.");
    expect(pageSource).toContain("Add verification platforms to support referrals.");
    expect(pageSource).toContain("Organized and easy to operate.");
    expect(pageSource).toContain("Sports cards for comics, and more.");
    expect(pageSource).not.toContain("A deliberate place to discover, value, and trade across all ten collector categories.");
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
