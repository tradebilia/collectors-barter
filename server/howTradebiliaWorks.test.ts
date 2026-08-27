import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("How Tradebilia Works guide", () => {
  const guide = read("client/src/pages/HowTradebiliaWorks.tsx");
  const app = read("client/src/App.tsx");
  const home = read("client/src/pages/Home.tsx");

  it("registers a public guide route and exposes it from the homepage footer", () => {
    expect(app).toContain('import HowTradebiliaWorks from "./pages/HowTradebiliaWorks"');
    expect(app).toContain('<Route path="/how-it-works" component={HowTradebiliaWorks} />');
    expect(home).toContain('href="/how-it-works"');
    expect(home).toContain("How Tradebilia Works");
  });

  it("describes the real trading sequence without presenting future payment services as active", () => {
    for (const title of ["Create your collector profile", "Add your collectibles", "Send a trade proposal", "Discuss and agree in the Trade Room", "Confirm, ship, and share tracking", "Complete the exchange", "Leave a review or report a concern"]) expect(guide).toContain(title);
    expect(guide).toContain("Free Launch access is currently available to members.");
    expect(guide).not.toContain("verification service is active");
    expect(guide).not.toContain("payment enforcement is active");
  });
});
