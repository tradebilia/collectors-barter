import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const emailTemplate = readFileSync(new URL("./_core/email.ts", import.meta.url), "utf8");

describe("transactional email logo", () => {
  it("uses the current durable Tradebilia logo rather than the retired storage reference", () => {
    expect(emailTemplate).toContain("tradebilia_final_transparent_8a1981e6.svg");
    expect(emailTemplate).not.toContain("tradebilia_final_transparent_58812c5a.svg");
    expect(emailTemplate).toContain('alt="Tradebilia"');
  });
});
