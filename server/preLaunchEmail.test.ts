import { describe, expect, it } from "vitest";
import { buildPreLaunchEmailHtml, getPreLaunchRecipients, sendPreLaunchUpdate } from "./preLaunchEmail";

const originalKey = process.env.RESEND_CONTACTS_API_KEY;

function response(ok: boolean, payload: unknown, status = 200) {
  return { ok, status, json: async () => payload } as Response;
}

describe("Pre-Launch Email", () => {
  it("lists only active Coming Soon opt-ins", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const recipients = await getPreLaunchRecipients(async () => response(true, {
      has_more: false,
      data: [
        { id: "active", email: "active@example.com", created_at: "2026-08-14", unsubscribed: false, properties: { signup_source: "coming_soon", signup_interest: "launch_updates" } },
        { id: "unsubscribed", email: "off@example.com", unsubscribed: true, properties: { signup_source: "coming_soon", signup_interest: "launch_updates" } },
        { id: "other", email: "other@example.com", unsubscribed: false, properties: { signup_source: "other" } },
      ],
    }) as any);
    expect(recipients).toEqual([{ id: "active", email: "active@example.com", createdAt: "2026-08-14" }]);
  });

  it("uses an opted-in segment broadcast with a provider unsubscribe link only when explicitly called", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const result = await sendPreLaunchUpdate({ subject: "A Tradebilia update", message: "We are getting closer." }, async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).startsWith("https://api.resend.com/contacts?")) return response(true, { has_more: false, data: [{ id: "contact-1", email: "member@example.com", unsubscribed: false, properties: { signup_source: "coming_soon", signup_interest: "launch_updates" } }] }) as any;
      if (String(url).startsWith("https://api.resend.com/segments?")) return response(true, { data: [{ id: "segment-1", name: "Tradebilia Pre-Launch Updates" }] }) as any;
      if (String(url).includes("/contacts/contact-1/segments/segment-1")) return response(true, { id: "segment-1" }) as any;
      if (String(url) === "https://api.resend.com/broadcasts") return response(true, { id: "broadcast-1" }) as any;
      throw new Error(`Unexpected request: ${url}`);
    });
    expect(result).toEqual({ recipientCount: 1, broadcastId: "broadcast-1" });
    const broadcast = requests.find(request => request.url.endsWith("/broadcasts"));
    expect(JSON.parse(String(broadcast?.init?.body))).toMatchObject({ segment_id: "segment-1", send: true, subject: "A Tradebilia update" });
    expect(String(broadcast?.init?.body)).toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("escapes drafted content and includes a provider-managed unsubscribe link", () => {
    const html = buildPreLaunchEmailHtml("<b>Hello</b>");
    expect(html).toContain("&lt;b&gt;Hello&lt;/b&gt;");
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  process.env.RESEND_CONTACTS_API_KEY = originalKey;
});
