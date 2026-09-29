import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pageSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ComingSoon.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");
const adminSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("Coming Soon experience", () => {
  it("keeps the supplied desktop composition intact while providing a responsive mobile launch experience including Music", () => {
    expect(pageSource).toContain('const SUPPLIED_COMING_SOON_HTML_URL = "/manus-storage/tradebilia_coming_soon_exact_ba8c631b.html";');
    expect(pageSource).toContain('className="relative mx-auto hidden aspect-[1815/867] w-full sm:block"');
    expect(pageSource).toContain("<iframe");
    expect(pageSource).toContain("src={SUPPLIED_COMING_SOON_HTML_URL}");
    expect(pageSource).toContain('aria-label="Tradebilia launch email signup"');
    expect(pageSource).toContain("const mobileCategories = [");
    expect(pageSource).toContain('{ label: "Music", Icon: Music2 }');
    expect(pageSource).toContain('aria-label="Tradebilia mobile launch signup"');
    expect(pageSource).toContain("grid grid-cols-5");
    expect(pageSource).toContain('sandbox=""');
    expect(pageSource).not.toContain("object-cover");
    expect(pageSource).not.toContain("tradebilia_final_transparent-Notagline");
  });

  it("registers the primary and preserved legacy Coming Soon routes", () => {
    expect(appSource).toContain('const ComingSoon = lazy(() => import("./pages/ComingSoon"));');
    expect(appSource).toContain('const ComingSoon2 = lazy(() => import("./pages/ComingSoon2"));');
    expect(appSource).toContain('<Route path="/coming-soon" component={ComingSoon} />');
    expect(appSource).toContain('<Route path="/coming-soon-2" component={ComingSoon2} />');
    expect(adminSource).toContain('href="/coming-soon"');
    expect(adminSource).toContain("Coming Soon Preview");
  });
});
