import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pageSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ComingSoon.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");
const adminSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("Coming Soon experience", () => {
  it("uses the exact supplied image as the no-crop visual baseline with Music represented in the category row", () => {
    expect(pageSource).toContain("coming-soon-exact-supplied_6f741f0e.png");
    expect(pageSource).toContain("w-[min(100vw,calc(100svh*605/289))]");
    expect(pageSource).toContain('aria-label="Music"');
    expect(pageSource).toContain("<Disc3");
    expect(pageSource).toContain(">MUSIC</span>");
    expect(pageSource).not.toContain("object-cover");
    expect(pageSource).not.toContain("tradebilia_final_transparent-Notagline");
    expect(pageSource).not.toContain("launchUpdates.subscribe");
  });

  it("registers the primary and preserved legacy Coming Soon routes", () => {
    expect(appSource).toContain('import ComingSoon from "./pages/ComingSoon"');
    expect(appSource).toContain('import ComingSoon2 from "./pages/ComingSoon2"');
    expect(appSource).toContain('<Route path="/coming-soon" component={ComingSoon} />');
    expect(appSource).toContain('<Route path="/coming-soon-2" component={ComingSoon2} />');
    expect(adminSource).toContain('href="/coming-soon"');
    expect(adminSource).toContain("Coming Soon Preview");
  });
});
