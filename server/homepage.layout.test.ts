import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tradebilia homepage layout", () => {
  const homepageSource = readFileSync(
    resolve(process.cwd(), "client/src/pages/Home.tsx"),
    "utf8",
  );

  it("keeps the Wix-aligned header and hero structure", () => {
    expect(homepageSource).toContain(
      `font-['Oswald'] text-[2.15rem] font-semibold leading-none tracking-[-0.05em] text-white sm:text-[2.45rem]">Search</span>`,
    );
    expect(homepageSource).toContain('tradebilia-wheel-home relative h-24 w-24');
    expect(homepageSource).toContain('Collectors Trading Exchange');
    expect(homepageSource).toContain('bg-[linear-gradient(90deg,#8e9093_0%,#d7dde6_50%,#8e9093_100%)]');
  });

  it("keeps the left rail and homepage bands that match the reference composition", () => {
    expect(homepageSource).toContain('My Inventory');
    expect(homepageSource).toContain('Upcoming Conventions');
    expect(homepageSource).toContain('Shipping Supplies');
    expect(homepageSource).toContain('Recently Added');
    expect(homepageSource).toContain('grid gap-0 md:grid-cols-2 xl:grid-cols-4 lg:col-start-2');
  });
});
