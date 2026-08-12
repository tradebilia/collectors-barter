import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const messagesPage = readFileSync(new URL("../client/src/pages/Messages.tsx", import.meta.url), "utf8");

describe("direct-message card hierarchy", () => {
  it("places counterpart direction, direct-message context, subject, and preview in that order", () => {
    const directionIndex = messagesPage.indexOf("{directPresentation?.listLabel}");
    const contextIndex = messagesPage.indexOf(">Direct Message</p>", directionIndex);
    const subjectIndex = messagesPage.indexOf('{thread.subject || "Direct message"}', contextIndex);
    const previewIndex = messagesPage.indexOf("{thread.summary}", subjectIndex);

    expect(directionIndex).toBeGreaterThan(-1);
    expect(contextIndex).toBeGreaterThan(directionIndex);
    expect(subjectIndex).toBeGreaterThan(contextIndex);
    expect(previewIndex).toBeGreaterThan(subjectIndex);
  });
});
