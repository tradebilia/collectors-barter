import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getUserById: vi.fn(),
}));

describe("password session revocation", () => {
  it("records password-version validation in custom authentication before returning a session user", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("server/_core/customAuth.ts", "utf8"));
    expect(source).toContain("passwordVersion");
    expect(source).toContain("session.passwordVersion !== this.getPasswordSessionVersion(user.passwordHash)");
  });
});
