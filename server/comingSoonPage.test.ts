import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pageSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ComingSoon.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");
const adminSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("Coming Soon experience", () => {
  it("uses the revised supplied-logo artwork, represents Music, and keeps an opt-in email form", () => {
    expect(pageSource).toContain("coming-soon-logo-music-desktop-clean_bf3f0ade.png");
    expect(pageSource).toContain("coming-soon-logo-music-mobile-clean_5a0bff0e.png");
    expect(pageSource).toContain("Tradebilia collectors trading exchange coming soon scene");
    expect(pageSource).toContain('const COMING_SOON_CATEGORIES = [');
    expect(pageSource).toContain('"Music"');
    expect(pageSource).toContain('aria-label="Collections on the exchange"');
    expect(pageSource).toContain("trpc.launchUpdates.subscribe.useMutation");
    expect(pageSource).toContain('const [alreadySubscribed, setAlreadySubscribed] = useState(false);');
    expect(pageSource).toContain("You&apos;re already on the early-access list.");
    expect(pageSource).toContain("We&apos;ll only use your email for Tradebilia launch updates.");
    expect(pageSource).toContain('placeholder="Enter your email for early access"');
    expect(pageSource).toContain('"Notify me"');
    expect(pageSource).toContain('role="alert" aria-live="polite"');
    expect(pageSource).toContain('role="status" aria-live="polite"');
  });

  it("registers the preview route and makes it available from the Admin Dashboard", () => {
    expect(appSource).toContain('import ComingSoon from "./pages/ComingSoon"');
    expect(appSource).toContain('import ComingSoon2 from "./pages/ComingSoon2"');
    expect(appSource).toContain('<Route path="/coming-soon" component={ComingSoon} />');
    expect(appSource).toContain('<Route path="/coming-soon-2" component={ComingSoon2} />');
    expect(adminSource).toContain('href="/coming-soon"');
    expect(adminSource).toContain("Coming Soon Preview");
    expect(adminSource).toContain('href="/coming-soon-2"');
    expect(adminSource).toContain("Coming Soon 2 (Legacy)");
    expect(adminSource).toContain('value="pre-launch-email"');
    expect(adminSource).toContain("Pre-Launch Email");
  });
});
