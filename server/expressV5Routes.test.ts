import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

describe("Express v5 route compatibility", () => {
  it("uses named wildcard routes for storage and SPA fallthrough", () => {
    const storageProxy = fs.readFileSync(path.join(root, "server/_core/storageProxy.ts"), "utf8");
    const vite = fs.readFileSync(path.join(root, "server/_core/vite.ts"), "utf8");

    expect(storageProxy).toContain('app.get("/manus-storage/*key"');
    expect(storageProxy).toContain('Array.isArray(keyParam) ? keyParam.join("/") : keyParam');
    expect(vite).toContain('app.use("/{*splat}"');
    expect(vite).not.toContain('app.use("*"');
  });
});

