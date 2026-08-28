type FetchLike = typeof fetch;

import { classifyApiFailure, recordApiFailure } from "./apiHealth";
import { isStagingSafetyEnabled, stagingSafetyReason } from "./_core/stagingSafety";
import {
  markPreLaunchDeliverySent,
  markPreLaunchDeliveryUncertain,
  reservePreLaunchDelivery,
} from "./preLaunchDelivery";

export type PreLaunchDeliveryStore = {
  reserve: typeof reservePreLaunchDelivery;
  markSent: typeof markPreLaunchDeliverySent;
  markUncertain: typeof markPreLaunchDeliveryUncertain;
};

const databaseDeliveryStore: PreLaunchDeliveryStore = {
  reserve: reservePreLaunchDelivery,
  markSent: markPreLaunchDeliverySent,
  markUncertain: markPreLaunchDeliveryUncertain,
};

const RESEND_API_BASE = "https://api.resend.com";
const PRE_LAUNCH_SEGMENT_NAME = "Tradebilia Pre-Launch Updates";
const FROM_ADDRESS = "Tradebilia <noreply@tradebilia.com>";
const SITE_URL = "https://tradebilia.manus.space";
const EMAIL_LOGO_URL = `https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg`;
const SEGMENT_ENROLLMENT_CONCURRENCY = 5;

type ResendContact = {
  id: string;
  email: string;
  created_at?: string;
  unsubscribed?: boolean;
  properties?: Record<string, unknown>;
};

export type PreLaunchRecipient = {
  id: string;
  email: string;
  createdAt: string | null;
};

type ResendFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
};

function getResendApiKey() {
  return process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY;
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function enrollContactsInSegment(
  contacts: ResendContact[],
  segmentId: string,
  fetcher: FetchLike,
  apiKey: string,
) {
  for (let start = 0; start < contacts.length; start += SEGMENT_ENROLLMENT_CONCURRENCY) {
    const batch = contacts.slice(start, start + SEGMENT_ENROLLMENT_CONCURRENCY);
    const results = await Promise.all(batch.map(async contact => {
      const enrollment = await fetcher(`${RESEND_API_BASE}/contacts/${encodeURIComponent(contact.id)}/segments/${segmentId}`, {
        method: "POST",
        headers: headers(apiKey),
        signal: AbortSignal.timeout(10_000),
      }) as ResendFetchResponse;
      return enrollment.ok || enrollment.status === 409;
    }));

    if (results.some(result => !result)) {
      throw new Error("Unable to prepare all opted-in recipients for delivery.");
    }
  }
}

async function listAllContacts(fetcher: FetchLike, apiKey: string) {
  const segmentId = await ensurePreLaunchSegment(fetcher, apiKey);
  const contacts: ResendContact[] = [];
  let after: string | undefined;

  for (;;) {
    const query = new URLSearchParams({ limit: "100" });
    if (after) query.set("after", after);
    const response = await fetcher(`${RESEND_API_BASE}/segments/${segmentId}/contacts?${query}`, {
      headers: headers(apiKey),
      signal: AbortSignal.timeout(10_000),
    }) as ResendFetchResponse;
    if (!response.ok) throw new Error("Unable to retrieve Pre-Launch Email recipients.");
    const payload = await response.json();
    const page = Array.isArray(payload?.data) ? payload.data as ResendContact[] : [];
    contacts.push(...page);
    if (!payload?.has_more || page.length === 0) break;
    after = page[page.length - 1]?.id;
    if (!after) break;
  }

  return contacts.filter(contact => contact.unsubscribed !== true);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildPreLaunchEmailHtml(message: string) {
  const paragraphs = escapeHtml(message.trim())
    .split(/\n{2,}/)
    .map(paragraph => `<p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.75;">${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:40px 20px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <tr><td style="background:#0a0d22;padding:24px 16px;text-align:center;"><img src="${EMAIL_LOGO_URL}" alt="Tradebilia" width="520" style="display:block;margin:0 auto;width:100%;max-width:520px;height:auto;"></td></tr>
      <tr><td style="padding:34px 32px;">${paragraphs}<a href="${SITE_URL}" style="display:inline-block;background:#7f31ff;color:#fff;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:700;font-size:14px;">Visit Tradebilia</a></td></tr>
      <tr><td style="background:#f8f8f6;padding:20px 32px;text-align:center;border-top:1px solid #ebebeb;"><p style="color:#8a8a8a;font-size:12px;line-height:1.6;margin:0;">You are receiving this because you opted in for Tradebilia pre-launch updates. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#7f31ff;text-decoration:none;">Unsubscribe</a></p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export async function ensurePreLaunchSegment(fetcher: FetchLike, apiKey: string) {
  const segmentsResponse = await fetcher(`${RESEND_API_BASE}/segments?limit=100`, {
    headers: headers(apiKey),
    signal: AbortSignal.timeout(10_000),
  }) as ResendFetchResponse;
  if (!segmentsResponse.ok) throw new Error("Unable to prepare the Pre-Launch Email recipient group.");
  const existing = (await segmentsResponse.json())?.data?.find((segment: any) => segment?.name === PRE_LAUNCH_SEGMENT_NAME);
  if (existing?.id) return existing.id as string;

  const createResponse = await fetcher(`${RESEND_API_BASE}/segments`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ name: PRE_LAUNCH_SEGMENT_NAME }),
    signal: AbortSignal.timeout(10_000),
  }) as ResendFetchResponse;
  if (!createResponse.ok) throw new Error("Unable to create the Pre-Launch Email recipient group.");
  const created = await createResponse.json();
  if (!created?.id) throw new Error("The Pre-Launch Email recipient group could not be prepared.");
  return created.id as string;
}

export async function getPreLaunchRecipients(fetcher: FetchLike = fetch): Promise<PreLaunchRecipient[]> {
  if (isStagingSafetyEnabled()) throw new Error(stagingSafetyReason("Pre-Launch recipient retrieval"));
  const apiKey = getResendApiKey();
  if (!apiKey) throw new Error("Pre-Launch Email is not configured yet.");
  try {
    const contacts = await listAllContacts(fetcher, apiKey);
    return contacts.map(contact => ({
      id: contact.id,
      email: contact.email,
      createdAt: contact.created_at ?? null,
    }));
  } catch (error) {
    await recordApiFailure({
      provider: "Resend",
      operation: "pre_launch_recipient_list",
      failureClass: classifyApiFailure({ message: error instanceof Error ? error.message : "Unknown failure" }),
      safeMessage: "Pre-Launch recipient retrieval failed.",
    });
    throw error;
  }
}

export async function sendPreLaunchUpdate(
  input: { subject: string; message: string; deliveryKey: string; requestedBy: number },
  fetcher: FetchLike = fetch,
  deliveryStore: PreLaunchDeliveryStore = databaseDeliveryStore,
) {
  if (isStagingSafetyEnabled()) throw new Error(stagingSafetyReason("Pre-Launch Email delivery"));
  const apiKey = getResendApiKey();
  if (!apiKey) throw new Error("Pre-Launch Email is not configured yet.");

  const reservation = await deliveryStore.reserve(input);
  if (reservation.kind === "sent") {
    return { recipientCount: reservation.recipientCount, broadcastId: reservation.broadcastId, reused: true };
  }
  if (reservation.kind === "uncertain") {
    throw new Error("The prior Pre-Launch delivery outcome is still being confirmed. It was not resent automatically.");
  }

  try {
    const contacts = await listAllContacts(fetcher, apiKey);
    if (contacts.length === 0) {
      await deliveryStore.markSent({ deliveryId: reservation.deliveryId, recipientCount: 0, broadcastId: null });
      return { recipientCount: 0, broadcastId: null as string | null, reused: false };
    }

    const segmentId = await ensurePreLaunchSegment(fetcher, apiKey);
    await enrollContactsInSegment(contacts, segmentId, fetcher, apiKey);

    const broadcast = await fetcher(`${RESEND_API_BASE}/broadcasts`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({
        segment_id: segmentId,
        from: FROM_ADDRESS,
        subject: input.subject.trim(),
        name: `Tradebilia pre-launch update ${new Date().toISOString()}`,
        html: buildPreLaunchEmailHtml(input.message),
        text: `${input.message.trim()}\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
        send: true,
      }),
      signal: AbortSignal.timeout(15_000),
    }) as ResendFetchResponse;
    if (!broadcast.ok) throw new Error("Resend could not deliver the Pre-Launch Email update.");
    const payload = await broadcast.json();
    if (!payload?.id) throw new Error("Resend did not confirm the Pre-Launch Email delivery.");
    await deliveryStore.markSent({ deliveryId: reservation.deliveryId, recipientCount: contacts.length, broadcastId: payload.id });
    return { recipientCount: contacts.length, broadcastId: payload.id, reused: false };
  } catch (error) {
    await deliveryStore.markUncertain(reservation.deliveryId);
    throw error;
  }
}
