import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

describe("dependency security configuration", () => {
  it("keeps audited transitive remediation overrides in the supported pnpm workspace file", () => {
    const workspace = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
    expect(workspace).toContain("qs: 6.15.2");
    expect(workspace).toContain("path-to-regexp: 0.1.13");
    expect(workspace).toContain("lodash: 4.18.1");
    expect(workspace).toContain("body-parser: 1.20.6");
    expect(workspace).toContain("wouter@3.7.1: patches/wouter@3.7.1.patch");
  });
});
