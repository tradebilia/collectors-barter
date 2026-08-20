import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const homepageSource = readFileSync(join(process.cwd(), "client/src/pages/Home.tsx"), "utf-8");

describe("homepage launch polish", () => {
  it("does not render a Member Growth metric", () => {
    expect(homepageSource).not.toContain("Member Growth");
    expect(homepageSource).toContain("grid-cols-2 items-center gap-0 sm:grid-cols-4");
  });

  it("does not render the Shipping Supplies Coming soon placeholder", () => {
    expect(homepageSource).not.toContain("Shipping Supplies");
  });
});
