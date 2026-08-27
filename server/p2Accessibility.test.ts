import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("P2 accessibility contracts", () => {
  it("associates every Sign Up label and validation error with its input", () => {
    const source = read("client/src/pages/SignUp.tsx");
    for (const id of ["signup-username", "signup-display-name", "signup-email", "signup-password"]) {
      expect(source).toContain(`htmlFor=\"${id}\"`);
      expect(source).toContain(`id=\"${id}\"`);
      expect(source).toContain("aria-invalid");
    }
    expect(source).toContain('role="alert"');
    expect(source).toContain('id="signup-password-help"');
  });

  it("gives the Trade Room video close control an explicit accessible action name", () => {
    expect(read("client/src/components/VideoChatPanel.tsx")).toContain('aria-label="End video call and close panel"');
  });
});
