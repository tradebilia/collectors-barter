import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(process.cwd());
const clientRoot = join(projectRoot, "client", "src");

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
  });
}

describe("avatar image fit", () => {
  it("uses a blurred same-image background and a sharp frame-filling foreground in the shared AvatarImage renderer", () => {
    const source = readFileSync(join(clientRoot, "components", "ui", "avatar.tsx"), "utf8");
    expect(source).toContain('data-slot="avatar-background"');
    expect(source).toContain("object-cover opacity-60 blur-md");
    expect(source).toContain("object-fill");
    expect(source).toContain('aria-hidden="true"');
  });

  it("uses cover only for decorative blurred avatar backgrounds and uses object-fill for avatar foregrounds", () => {
    const invalidAvatarFitLines = collectTsxFiles(clientRoot).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .map((line, index) => ({ path, line: index + 1, value: line }))
        .filter(({ value }) => /avatarUrl|AvatarImage|theirAvatarUrl|myAvatarUrl/.test(value))
        .filter(({ value }) => value.includes("object-contain"))
        .map(({ path: file, line, value }) => `${file}:${line}: ${value.trim()}`),
    );

    expect(invalidAvatarFitLines).toEqual([]);
  });

  it("keeps every audited direct avatar view on the layered frame-filling treatment", () => {
    const paths = [
      "components/RecentTradesCarousel.tsx",
      "pages/TradeShowcase.tsx",
      "pages/PublicProfile.tsx",
      "pages/VerifiedMerchants.tsx",
      "pages/WarRoom.tsx",
    ];

    for (const relativePath of paths) {
      const source = readFileSync(join(clientRoot, relativePath), "utf8");
      expect(source).toContain("object-fill");
      expect(source).toContain("blur-md");
    }
  });
});
