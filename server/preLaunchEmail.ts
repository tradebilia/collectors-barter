type FetchLike = typeof fetch;

import { classifyApiFailure, recordApiFailure } from "./apiHealth";

const RESEND_API_BASE = "https://api.resend.com";
const PRE_LAUNCH_SEGMENT_NAME = "Tradebilia Pre-Launch Updates";
const FROM_ADDRESS = "Tradebilia <noreply@tradebilia.com>";
const SITE_URL = "https://tradebilia.manus.space";
const EMAIL_LOGO_URL = `https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg`;
const EMAIL_HERO_BACKGROUND_URL = `https://assets.tradebilia.com/Background_23084d14.jpg`;
const SEGMENT_ENROLLMENT_CONCURRENCY = 5;
const LAST_SENT_PROPERTY = "tradebilia_prelaunch_last_sent_at";

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
  lastSentAt: string | null;
};

type ResendFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
};

function getResendContactsApiKey() {
  return process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY;
}

function getResendBroadcastApiKey() {
  return process.env.RESEND_API_KEY || process.env.RESEND_CONTACTS_API_KEY;
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
    .map(paragraph => `<p style="margin:0 0 20px;font-size:16px;color:#334155;line-height:1.75;">${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f2;padding:40px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,.12);">
      <tr><td background="${EMAIL_HERO_BACKGROUND_URL}" style="background:#08162a url('${EMAIL_HERO_BACKGROUND_URL}') center/cover no-repeat;padding:0;text-align:center;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(4,15,35,.82);"><tr><td style="padding:46px 32px 42px;text-align:center;"><img src="${EMAIL_LOGO_URL}" alt="Tradebilia — Collectors Trading Exchange" width="500" style="display:block;margin:0 auto;width:100%;max-width:500px;height:auto;"></td></tr></table></td></tr>
      <tr><td style="padding:38px 40px 42px;">${paragraphs}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr><td style="background:#0f9b86;border-radius:8px;"><a href="${SITE_URL}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 24px;font-weight:700;font-size:14px;letter-spacing:.01em;">Explore Tradebilia</a></td></tr></table></td></tr>
      <tr><td style="background:#f7f8f8;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#7b8490;font-size:12px;line-height:1.6;margin:0;">You are receiving this because you opted in for Tradebilia pre-launch updates. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#0f9b86;text-decoration:underline;">Unsubscribe</a></p></td></tr>
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
  const apiKey = getResendContactsApiKey();
  if (!apiKey) throw new Error("Pre-Launch Email is not configured yet.");
  try {
    const contacts = await listAllContacts(fetcher, apiKey);
    return contacts.map(contact => ({
      id: contact.id,
      email: contact.email,
      createdAt: contact.created_at ?? null,
      lastSentAt: typeof contact.properties?.[LAST_SENT_PROPERTY] === "string" ? contact.properties[LAST_SENT_PROPERTY] : null,
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

export async function getPreLaunchBroadcastStatuses(fetcher: FetchLike = fetch) {
  const apiKey = getResendBroadcastApiKey();
  if (!apiKey) throw new Error("Pre-Launch Email is not configured yet.");
  const response = await fetcher(`${RESEND_API_BASE}/broadcasts?limit=20`, {
    headers: headers(apiKey),
    signal: AbortSignal.timeout(10_000),
  }) as ResendFetchResponse;
  if (!response.ok) throw new Error("Unable to retrieve Pre-Launch Email delivery status.");
  const payload = await response.json();
  const broadcasts = Array.isArray(payload?.data) ? payload.data : [];
  return broadcasts
    .filter((broadcast: any) => typeof broadcast?.name === "string" && broadcast.name.startsWith("Tradebilia pre-launch update"))
    .slice(0, 1)
    .map((broadcast: any) => ({
      id: typeof broadcast.id === "string" ? broadcast.id : "unknown",
      status: typeof broadcast.status === "string" ? broadcast.status : null,
      sentAt: typeof broadcast.sent_at === "string" ? broadcast.sent_at : null,
      createdAt: typeof broadcast.created_at === "string" ? broadcast.created_at : null,
    }));
}

export async function sendPreLaunchUpdate(
  input: { subject: string; message: string; recipientIds?: string[] },
  fetcher: FetchLike = fetch,
) {
  const contactsApiKey = getResendContactsApiKey();
  const broadcastApiKey = getResendBroadcastApiKey();
  if (!contactsApiKey || !broadcastApiKey) throw new Error("Pre-Launch Email is not configured yet.");

  const contacts = await listAllContacts(fetcher, contactsApiKey);
  const requestedIds = input.recipientIds ? new Set(input.recipientIds) : null;
  const selectedContacts = requestedIds ? contacts.filter(contact => requestedIds.has(contact.id)) : contacts;
  if (selectedContacts.length === 0) return { recipientCount: 0, broadcastId: null as string | null };

  const segmentName = `Tradebilia Pre-Launch Send ${new Date().toISOString()}`;
  const segmentResponse = await fetcher(`${RESEND_API_BASE}/segments`, {
    method: "POST",
    headers: headers(broadcastApiKey),
    body: JSON.stringify({ name: segmentName }),
    signal: AbortSignal.timeout(10_000),
  }) as ResendFetchResponse;
  if (!segmentResponse.ok) throw new Error("Unable to prepare the selected Pre-Launch Email recipients.");
  const segmentPayload = await segmentResponse.json();
  if (!segmentPayload?.id) throw new Error("The selected recipient group could not be prepared.");
  const segmentId = segmentPayload.id as string;
  await enrollContactsInSegment(selectedContacts, segmentId, fetcher, broadcastApiKey);

  const broadcast = await fetcher(`${RESEND_API_BASE}/broadcasts`, {
    method: "POST",
    headers: headers(broadcastApiKey),
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
  const sentAt = new Date().toISOString();
  const propertyResponse = await fetcher(`${RESEND_API_BASE}/contact-properties`, {
    method: "POST",
    headers: headers(broadcastApiKey),
    body: JSON.stringify({ key: LAST_SENT_PROPERTY, type: "string", fallback_value: "" }),
    signal: AbortSignal.timeout(10_000),
  }) as ResendFetchResponse;
  if (!propertyResponse.ok && propertyResponse.status !== 409) {
    await recordApiFailure({ provider: "Resend", operation: "pre_launch_last_sent_property", failureClass: "upstream", safeMessage: "Pre-Launch recipient timestamp tracking could not be prepared." });
  } else {
    await Promise.all(selectedContacts.map(async contact => {
      const update = await fetcher(`${RESEND_API_BASE}/contacts/${encodeURIComponent(contact.id)}`, {
        method: "PATCH",
        headers: headers(broadcastApiKey),
        body: JSON.stringify({ properties: { [LAST_SENT_PROPERTY]: sentAt } }),
        signal: AbortSignal.timeout(10_000),
      }) as ResendFetchResponse;
      if (!update.ok) throw new Error("Unable to record recipient send timestamp.");
    }));
  }
  return { recipientCount: selectedContacts.length, broadcastId: payload?.id ?? null };
}
