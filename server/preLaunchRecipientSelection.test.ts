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
    expect(serviceSource).toContain("headers(contactsApiKey)");
    expect(serviceSource).toContain("getReusableDeliverySegment");
    expect(serviceSource).toContain("clearSegmentContacts");
  });

  it("keeps all opted-in recipients, explicit review, and provider-managed unsubscribe handling visible in the Admin tab", () => {
    expect(tabSource).toContain("getPreLaunchRecipients");
    expect(tabSource).toContain("setConfirmOpen(true)");
    expect(tabSource).toContain("`Send to ${recipients.length}`");
    expect(tabSource).toContain("Unsubscribed contacts are excluded automatically.");
    expect(tabSource).toContain("sendMutation.mutate({ subject, message })");
  });
});
