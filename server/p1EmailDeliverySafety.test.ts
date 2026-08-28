import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeEmailHtml, escapeEmailTextWithBreaks, sendNewDirectMessageEmail, toSafeEmailSubject } from "./_core/email";
import { subscribeToLaunchUpdates } from "./launchUpdates";
import { isLaunchUpdateRequestAllowed, resetLaunchUpdateRateLimitForTest } from "./launchUpdatesRateLimit";
import { getPreLaunchRecipients, sendPreLaunchUpdate, type PreLaunchDeliveryStore } from "./preLaunchEmail";
import { hashPreLaunchDeliveryPayload, reservePreLaunchDelivery } from "./preLaunchDelivery";

const originalStaging = process.env.TRADEBILIA_STAGING_MODE;
const originalContactsKey = process.env.RESEND_CONTACTS_API_KEY;

function response(payload: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload } as Response;
}

function deliveryStore(reservation: Awaited<ReturnType<PreLaunchDeliveryStore["reserve"]>>): PreLaunchDeliveryStore {
  return {
    reserve: vi.fn().mockResolvedValue(reservation),
    markSent: vi.fn().mockResolvedValue(undefined),
    markUncertain: vi.fn().mockResolvedValue(undefined),
  };
}

function deliveryDatabase(existing: Record<string, unknown>, claimAffectedRows = 1) {
  const values = vi.fn().mockResolvedValue(undefined);
  const limit = vi.fn().mockResolvedValue([existing]);
  const whereSelect = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where: whereSelect });
  const whereUpdate = vi.fn().mockResolvedValue({ affectedRows: claimAffectedRows });
  const set = vi.fn().mockReturnValue({ where: whereUpdate });
  return {
    insert: vi.fn().mockReturnValue({ values }),
    select: vi.fn().mockReturnValue({ from }),
    update: vi.fn().mockReturnValue({ set }),
    __spies: { values, limit, whereUpdate },
  } as any;
}

afterEach(() => {
  process.env.TRADEBILIA_STAGING_MODE = originalStaging;
  process.env.RESEND_CONTACTS_API_KEY = originalContactsKey;
  delete process.env.RESEND_API_KEY;
  resetLaunchUpdateRateLimitForTest();
  vi.unstubAllGlobals();
});

describe("P1 email and Pre-Launch delivery safety", () => {
  it("encodes email HTML text, preserves intentional line breaks, and strips header-injection control characters", () => {
    expect(escapeEmailHtml(`<img src=x onerror="alert('x')"> &`)).toBe("&lt;img src=x onerror=&quot;alert(&#039;x&#039;)&quot;&gt; &amp;");
    expect(escapeEmailTextWithBreaks("first\n<script>alert(1)</script>")).toBe("first<br>&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(toSafeEmailSubject("Hello\r\nBcc: outsider@example.com\u0000")).toBe("Hello Bcc: outsider@example.com");
  });

  it("sends only encoded direct-message HTML and a header-safe subject through the provider boundary", async () => {
    process.env.TRADEBILIA_STAGING_MODE = "0";
    process.env.RESEND_API_KEY = "test-key";
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetcher);

    await expect(sendNewDirectMessageEmail({
      recipientEmail: "recipient@example.com",
      recipientName: "Recipient",
      senderName: `<img src=x onerror="alert(1)">`,
      subject: "Question\r\nBcc: outsider@example.com",
      bodyPreview: "<script>alert(1)</script>",
    })).resolves.toBe(true);

    const payload = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(payload.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(payload.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(payload.html).not.toContain("<script>alert(1)</script>");
    expect(payload.subject).toBe("New message from <img src=x onerror=\"alert(1)\"> on Tradebilia");
  });

  it("refuses public signup before a provider call whenever staging safety is active", async () => {
    process.env.TRADEBILIA_STAGING_MODE = "1";
    delete process.env.RESEND_CONTACTS_API_KEY;
    const fetcher = vi.fn();
    await expect(subscribeToLaunchUpdates("member@example.com", fetcher)).rejects.toThrow("disabled while TRADEBILIA_STAGING_MODE is enabled");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not expose the provider contact audience through the staging Pre-Launch workspace", async () => {
    process.env.TRADEBILIA_STAGING_MODE = "1";
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi.fn();
    await expect(getPreLaunchRecipients(fetcher)).rejects.toThrow("disabled while TRADEBILIA_STAGING_MODE is enabled");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("limits repeat public signup attempts locally by normalized email and request source", () => {
    const key = "198.51.100.8:member@example.com";
    expect(Array.from({ length: 4 }, () => isLaunchUpdateRequestAllowed(key))).toEqual([true, true, true, true]);
    expect(isLaunchUpdateRequestAllowed(key)).toBe(false);
    expect(isLaunchUpdateRequestAllowed("198.51.100.9:member@example.com")).toBe(true);
  });

  it("claims only one prepared delivery-key record before a broadcast can be submitted", async () => {
    const input = { subject: "Update", message: "Ready", deliveryKey: "77777777-7777-4777-8777-777777777777", requestedBy: 1 };
    const database = deliveryDatabase({ id: 17, requestedBy: 1, payloadHash: hashPreLaunchDeliveryPayload(input), status: "prepared" });
    await expect(reservePreLaunchDelivery(input, database)).resolves.toEqual({ kind: "claimed", deliveryId: 17 });
    expect(database.__spies.whereUpdate).toHaveBeenCalledTimes(1);
  });

  it("replays completed delivery metadata but leaves an in-progress or competing delivery uncertain", async () => {
    const input = { subject: "Update", message: "Ready", deliveryKey: "88888888-8888-4888-8888-888888888888", requestedBy: 1 };
    const sentDatabase = deliveryDatabase({ id: 17, requestedBy: 1, payloadHash: hashPreLaunchDeliveryPayload(input), status: "sent", recipientCount: 4, broadcastId: "broadcast-4" });
    await expect(reservePreLaunchDelivery(input, sentDatabase)).resolves.toEqual({ kind: "sent", recipientCount: 4, broadcastId: "broadcast-4" });
    expect(sentDatabase.update).not.toHaveBeenCalled();

    const competingDatabase = deliveryDatabase({ id: 18, requestedBy: 1, payloadHash: hashPreLaunchDeliveryPayload(input), status: "prepared" }, 0);
    await expect(reservePreLaunchDelivery(input, competingDatabase)).resolves.toEqual({ kind: "uncertain" });
    expect(competingDatabase.__spies.whereUpdate).toHaveBeenCalledTimes(1);
  });

  it("replays a confirmed prior broadcast result without invoking Resend again", async () => {
    process.env.TRADEBILIA_STAGING_MODE = "0";
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi.fn();
    const store = deliveryStore({ kind: "sent", recipientCount: 3, broadcastId: "broadcast-1" });
    await expect(sendPreLaunchUpdate({ subject: "Update", message: "Ready", deliveryKey: "33333333-3333-4333-8333-333333333333", requestedBy: 1 }, fetcher, store)).resolves.toEqual({ recipientCount: 3, broadcastId: "broadcast-1", reused: true });
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.markSent).not.toHaveBeenCalled();
  });

  it("does not automatically resend an uncertain prior broadcast", async () => {
    process.env.TRADEBILIA_STAGING_MODE = "0";
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi.fn();
    const store = deliveryStore({ kind: "uncertain" });
    await expect(sendPreLaunchUpdate({ subject: "Update", message: "Ready", deliveryKey: "44444444-4444-4444-8444-444444444444", requestedBy: 1 }, fetcher, store)).rejects.toThrow("not resent automatically");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("marks a claimed delivery uncertain if provider submission fails before confirmation", async () => {
    process.env.TRADEBILIA_STAGING_MODE = "0";
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const store = deliveryStore({ kind: "claimed", deliveryId: 17 });
    await expect(sendPreLaunchUpdate({ subject: "Update", message: "Ready", deliveryKey: "55555555-5555-4555-8555-555555555555", requestedBy: 1 }, vi.fn().mockRejectedValue(new Error("network unavailable")), store)).rejects.toThrow("network unavailable");
    expect(store.markUncertain).toHaveBeenCalledWith(17);
    expect(store.markSent).not.toHaveBeenCalled();
  });

  it("records the confirmed broadcast identity only after provider success", async () => {
    process.env.TRADEBILIA_STAGING_MODE = "0";
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const store = deliveryStore({ kind: "claimed", deliveryId: 17 });
    const fetcher = vi.fn(async (url: string) => {
      if (url === "https://api.resend.com/segments?limit=100") return response({ data: [{ id: "segment-1", name: "Tradebilia Pre-Launch Updates" }] });
      if (url.startsWith("https://api.resend.com/segments/segment-1/contacts?")) return response({ has_more: false, data: [{ id: "contact-1", email: "member@example.com" }] });
      if (url.includes("/contacts/contact-1/segments/segment-1")) return response({ id: "segment-1" });
      if (url === "https://api.resend.com/broadcasts") return response({ id: "broadcast-9" });
      throw new Error(`Unexpected request: ${url}`);
    });
    await expect(sendPreLaunchUpdate({ subject: "Update", message: "Ready", deliveryKey: "66666666-6666-4666-8666-666666666666", requestedBy: 1 }, fetcher, store)).resolves.toEqual({ recipientCount: 1, broadcastId: "broadcast-9", reused: false });
    expect(store.markSent).toHaveBeenCalledWith({ deliveryId: 17, recipientCount: 1, broadcastId: "broadcast-9" });
    expect(store.markUncertain).not.toHaveBeenCalled();
  });
});
