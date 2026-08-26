import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Profile page tab strip overflow", () => {
  it("keeps narrow-screen horizontal tab access while suppressing vertical overflow controls", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/AccountSettings.tsx"), "utf8");
    expect(source).toContain("overflow-x-auto overflow-y-hidden");
    expect(source).toContain('value="membership"');
  });
});
