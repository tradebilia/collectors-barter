import { describe, expect, it, vi } from "vitest";
import { buildPreLaunchEmailHtml, getPreLaunchRecipients, sendPreLaunchUpdate } from "./preLaunchEmail";

const originalKey = process.env.RESEND_CONTACTS_API_KEY;

function response(ok: boolean, payload: unknown, status = 200) {
  return { ok, status, json: async () => payload } as Response;
}

describe("Pre-Launch Email", () => {
  it("lists only active Coming Soon opt-ins", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(true, { data: [{ id: "segment-1", name: "Tradebilia Pre-Launch Updates" }] }))
      .mockResolvedValueOnce(response(true, {
      has_more: false,
      data: [
        { id: "active", email: "active@example.com", created_at: "2026-08-14", unsubscribed: false },
        { id: "unsubscribed", email: "off@example.com", unsubscribed: true },
      ],
    }));
    const recipients = await getPreLaunchRecipients(fetcher as any);
    expect(recipients).toEqual([{ id: "active", email: "active@example.com", createdAt: "2026-08-14", lastSentAt: null }]);
    expect(fetcher.mock.calls[1]?.[0]).toContain("/segments/segment-1/contacts?");
  });

  it("uses an opted-in segment broadcast with a provider unsubscribe link only when explicitly called", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const result = await sendPreLaunchUpdate({ subject: "A Tradebilia update", message: "We are getting closer." }, async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).startsWith("https://api.resend.com/segments/segment-1/contacts?")) return response(true, { has_more: false, data: [{ id: "contact-1", email: "member@example.com", unsubscribed: false }] }) as any;
      if (String(url).startsWith("https://api.resend.com/segments?")) return response(true, { data: [{ id: "segment-1", name: "Tradebilia Pre-Launch Updates" }] }) as any;
      if (String(url) === "https://api.resend.com/segments") return response(true, { id: "selected-segment" }) as any;
      if (String(url).includes("/contacts/contact-1/segments/selected-segment")) return response(true, { id: "selected-segment" }) as any;
      if (String(url) === "https://api.resend.com/broadcasts") return response(true, { id: "broadcast-1" }) as any;
      if (String(url) === "https://api.resend.com/contact-properties") return response(false, {}, 409) as any;
      if (String(url) === "https://api.resend.com/contacts/contact-1") return response(true, { id: "contact-1" }) as any;
      throw new Error(`Unexpected request: ${url}`);
    });
    expect(result).toEqual({ recipientCount: 1, broadcastId: "broadcast-1" });
    const broadcast = requests.find(request => request.url.endsWith("/broadcasts"));
    expect(JSON.parse(String(broadcast?.init?.body))).toMatchObject({ segment_id: "selected-segment", send: true, subject: "A Tradebilia update" });
    expect(String(broadcast?.init?.body)).toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("enrolls recipients in bounded batches before creating a broadcast", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const recipients = Array.from({ length: 6 }, (_, index) => ({ id: `contact-${index}`, email: `member-${index}@example.com`, unsubscribed: false }));
    let activeEnrollments = 0;
    let peakEnrollments = 0;
    const result = await sendPreLaunchUpdate({ subject: "Batch test", message: "Enrollment test" }, async (url) => {
      const target = String(url);
      if (target.startsWith("https://api.resend.com/segments/segment-1/contacts?")) return response(true, { has_more: false, data: recipients }) as any;
      if (target.startsWith("https://api.resend.com/segments?")) return response(true, { data: [{ id: "segment-1", name: "Tradebilia Pre-Launch Updates" }] }) as any;
      if (target === "https://api.resend.com/segments") return response(true, { id: "selected-segment" }) as any;
      if (target.includes("/segments/selected-segment")) {
        activeEnrollments += 1;
        peakEnrollments = Math.max(peakEnrollments, activeEnrollments);
        await new Promise(resolve => setTimeout(resolve, 5));
        activeEnrollments -= 1;
        return response(true, { id: "segment-1" }) as any;
      }
      if (target === "https://api.resend.com/broadcasts") return response(true, { id: "broadcast-1" }) as any;
      if (target === "https://api.resend.com/contact-properties") return response(false, {}, 409) as any;
      if (target.startsWith("https://api.resend.com/contacts/contact-")) return response(true, { id: "contact" }) as any;
      throw new Error(`Unexpected request: ${target}`);
    });

    expect(result.recipientCount).toBe(6);
    expect(peakEnrollments).toBe(5);
  });

  it("escapes drafted content and includes a provider-managed unsubscribe link", () => {
    const html = buildPreLaunchEmailHtml("<b>Hello</b>");
    expect(html).toContain("&lt;b&gt;Hello&lt;/b&gt;");
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  it("records only a safe operational classification when recipient retrieval fails", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    await expect(getPreLaunchRecipients(async () => response(false, {}, 503) as any)).rejects.toThrow("Unable to prepare the Pre-Launch Email recipient group.");
  });

  process.env.RESEND_CONTACTS_API_KEY = originalKey;
});
