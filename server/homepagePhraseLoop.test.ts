import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const phraseLoopSource = fs.readFileSync(path.join(projectRoot, "client/src/components/HomepagePhraseLoop.tsx"), "utf8");

describe("homepage slogan wheel sharpness", () => {
  it("avoids transformed SVG scaling on mobile while preserving the desktop transform", () => {
    expect(phraseLoopSource).toContain("scale-100 translate-x-0 sm:scale-[2.2] sm:-translate-x-4");
    expect(phraseLoopSource).not.toContain('className="h-full max-h-28 w-full object-contain scale-[2.2] -translate-x-4"');
  });
});

// This source-level contract intentionally keeps the mobile fix scoped to the slogan logo.
// The slogan section height, animation timing, and desktop breakpoint behavior remain unchanged.

void describe;
void expect;
void it;
void phraseLoopSource;
void projectRoot;
void path;
void fs;
