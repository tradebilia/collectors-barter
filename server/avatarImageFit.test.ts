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
  it("uses contain fitting in the shared AvatarImage renderer", () => {
    const source = readFileSync(join(clientRoot, "components", "ui", "avatar.tsx"), "utf8");
    expect(source).toContain("object-contain");
    expect(source).not.toContain("object-cover");
  });

  it("does not retain crop-prone circular image classes anywhere in the client", () => {
    const cropProneLines = collectTsxFiles(clientRoot).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .map((line, index) => ({ path, line: index + 1, value: line }))
        .filter(({ value }) => /rounded-full[^"`]*object-cover|object-cover[^"`]*rounded-full/.test(value))
        .map(({ path: file, line, value }) => `${file}:${line}: ${value.trim()}`),
    );

    expect(cropProneLines).toEqual([]);
  });

  it("keeps the audited direct avatar views on full-image containment", () => {
    const paths = [
      "pages/TradeShowcase.tsx",
      "pages/PublicProfile.tsx",
      "pages/VerifiedMerchants.tsx",
      "pages/WarRoom.tsx",
      "pages/AccountSetup.tsx",
      "pages/ForumTopic.tsx",
    ];

    for (const relativePath of paths) {
      expect(readFileSync(join(clientRoot, relativePath), "utf8")).toContain("object-contain");
    }
  });
});
