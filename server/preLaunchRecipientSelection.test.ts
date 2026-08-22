import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const serviceSource = readFileSync(resolve(__dirname, "preLaunchEmail.ts"), "utf8");
const tabSource = readFileSync(resolve(__dirname, "../client/src/components/PreLaunchEmailTab.tsx"), "utf8");

describe("Pre-Launch recipient selection", () => {
  it("sends only selected recipient IDs and records their last-send timestamp", () => {
    expect(serviceSource).toContain("recipientIds?: string[]");
    expect(serviceSource).toContain("const selectedContacts");
    expect(serviceSource).toContain("tradebilia_prelaunch_last_sent_at");
    expect(serviceSource).toContain("method: \"PATCH\"");
    expect(serviceSource).toContain("getResendBroadcastApiKey");
    expect(serviceSource).toContain("headers(broadcastApiKey)");
  });

  it("keeps recipient selection and latest-only handoff visible in the Admin tab", () => {
    expect(tabSource).toContain("selectedRecipientIds");
    expect(tabSource).toContain("Last sent");
    expect(tabSource).toContain("Select all recipients");
    expect(serviceSource).toContain(".slice(0, 1)");
  });
});
