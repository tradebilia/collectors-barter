import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "client", "src", "pages", "MemberSearch.tsx"), "utf-8");

describe("Member Directory hero integration", () => {
  it("uses the shared top bar, homepage hero background, supplied title artwork, and category bar", () => {
    expect(source).toContain('import { TopBar } from "@/components/TopBar"');
    expect(source).toContain('import { CategoryBar } from "@/components/CategoryBar"');
    expect(source).toContain('backgroundImage: "url(https://assets.tradebilia.com/Background_23084d14.jpg)"');
    expect(source).toContain('src="https://assets.tradebilia.com/MemberDirectory_de7393cf.webp"');
    expect(source).toContain('<CategoryBar />');
  });

  it("retains the explicit Verified Merchant filter", () => {
    expect(source).toContain("Verified Merchant only");
  });
});
