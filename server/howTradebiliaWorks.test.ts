import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("How Tradebilia Works guide", () => {
  const guide = read("client/src/pages/HowTradebiliaWorks.tsx");
  const app = read("client/src/App.tsx");
  const home = read("client/src/pages/Home.tsx");
  const categoryBar = read("client/src/components/CategoryBar.tsx");

  it("registers a public guide route and exposes it from the homepage footer", () => {
    expect(app).toContain('import HowTradebiliaWorks from "./pages/HowTradebiliaWorks"');
    expect(app).toContain('<Route path="/how-it-works" component={HowTradebiliaWorks} />');
    expect(home).toContain('href="/how-it-works"');
    expect(home).toContain("How Tradebilia Works");
    expect(categoryBar).not.toContain('href="/how-it-works"');
    expect(categoryBar).not.toContain("How It Works");
  });

  it("describes the real trading sequence without presenting future payment services as active", () => {
    for (const title of [
      "Create your collector profile",
      "Add your collectibles",
      "Send a trade proposal",
      "Discuss and agree in the Trade Room",
      "Confirm, ship, and share tracking",
      "Complete the exchange",
      "Leave a review or report a concern",
    ]) {
      expect(guide).toContain(title);
    }
    expect(guide).toContain("Free Launch access is currently available to members.");
    expect(guide).not.toContain("verification service is active");
    expect(guide).not.toContain("payment enforcement is active");
  });

  it("includes a concise illustrated trade flow and a factual FAQ", () => {
    for (const label of ["Build your collection", "Find a match", "Agree together", "Complete the exchange", "Common questions"]) {
      expect(guide).toContain(label);
    }
    expect(guide).toContain("Do I need an account to participate in a trade?");
    expect(guide).toContain("Is Tradebilia charging members right now?");
    expect(guide).toContain("No live Membership payment or access enforcement is active during Free Launch.");
  });

  it("includes an accurate labeled Trade Room guide, practical safety checklist, and public glossary", () => {
    for (const label of [
      "Inside the Trade Room",
      "Illustrative example — fictional collectors and items",
      "These sample screenshots describe the current process",
      "1. Review the proposal",
      "2. Confirm the exchange",
      "3. Confirm receipt",
      "A practical safety checklist",
      "Collector trading glossary",
    ]) {
      expect(guide).toContain(label);
    }
    for (const term of ["Trade proposal", "Counteroffer", "Tracking", "Mutual confirmation", "Completed trade", "Report a concern"]) {
      expect(guide).toContain(term);
    }
    expect(guide).toContain("Keep private details private.");
    expect(guide).toContain("Illustrative example — fictional collectors and items");
    expect(guide).toContain("trade-room-review-sample_ced37cf9.png");
    expect(guide).toContain("trade-room-confirm-sample_051f1b84.png");
    expect(guide).toContain("trade-room-complete-sample_4bbcfa74.png");
  });
});
