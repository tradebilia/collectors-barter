import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const homepageSource = readFileSync(join(process.cwd(), "client/src/pages/Home.tsx"), "utf-8");

describe("homepage launch polish", () => {
  it("does not make an unsupported public member-growth claim", () => {
    expect(homepageSource).toContain('["trending", "Member Growth", "Calculating"]');
    expect(homepageSource).not.toContain('["trending", "Member Growth", "+15%"]');
  });

  it("does not render the Shipping Supplies Coming soon placeholder", () => {
    expect(homepageSource).not.toContain("Shipping Supplies");
  });
});
