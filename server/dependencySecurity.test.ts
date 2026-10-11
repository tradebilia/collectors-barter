import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

describe("dependency security configuration", () => {
  it("pins patched and Express-compatible release floors in the application manifest", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const workspace = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");

    expect(manifest.dependencies).toMatchObject({
      mysql2: "^3.24.5",
      jsdom: "^30.1.2",
      "proxy-addr": "2.0.8",
      "source-map-js": "1.2.2",
      qs: "6.16.0",
      "path-to-regexp": "8.4.2",
    });
    expect(workspace).toContain("wouter@3.7.1: patches/wouter@3.7.1.patch");
    expect(workspace).not.toContain("path-to-regexp: 0.1.13");
  });
});
