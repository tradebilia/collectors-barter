import { ENV } from "./_core/env";
import { type TnnScriptAnchorMode, type TnnScriptDuration } from "./tnnVideoScript";

type ManusContentPart =
  | { type: "text"; text: string }
  | { type: "file"; file_url: string; filename?: string; mime_type?: string };

type ManusAttachment = {
  type?: string;
  filename?: string;
  url?: string;
  content_type?: string;
  path?: string;
};

type ManusMessage = {
  type?: string;
  status?: string;
  content?: string | ManusContentPart[];
  attachments?: ManusAttachment[];
  error?: { message?: string };
};

export type TnnVideoTaskItem = {
  title: string;
  imageUrl?: string | null;
  grade?: string | number | null;
  certificationCompany?: string | null;
  customGradingCompany?: string | null;
  facts?: Array<{ label: string; value: string }>;
};

export type TnnVideoTaskInput = {
  script: string;
  durationSeconds: TnnScriptDuration;
  anchorMode: TnnScriptAnchorMode;
  sellerName: string;
  buyerName: string;
  cashOnly: boolean;
  selectedItems: TnnVideoTaskItem[];
  additionalItemsCount: number;
  tickerText: string;
  logoUrl: string;
  imageUrls: string[];
  generationAttempt: 1 | 2;
};

function requireApiKey() {
  if (!ENV.manusApiKey) {
    throw new Error("Manus video generation is not configured. Add MANUS_API_KEY to the project secrets.");
  }
  return ENV.manusApiKey;
}

async function manusRequest<T>(path: string, init: RequestInit = {}) {
  const apiKey = requireApiKey();
  const response = await fetch(`https://api.manus.ai${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-manus-api-key": apiKey,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null) as T & { ok?: boolean; error?: { message?: string } } | null;
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error?.message || `Manus API request failed (${response.status}).`);
  }
  return body as T;
}

function anchorDirection(anchorMode: TnnScriptAnchorMode) {
  const max = "Max Tradebloski: middle-aged American male TNN anchor, tailored navy suit, professional calm authority.";
  const sidney = "Sidney Tradewell: middle-aged American female TNN anchor, tailored jewel-tone newsroom suit, poised professional credibility.";
  if (anchorMode === "duo") return `${max}\n${sidney}\nThey are seated together at the anchor desk and each delivers at least one consecutive part of the supplied script.`;
  return anchorMode === "max" ? max : sidney;
}

function itemReferenceLines(items: readonly TnnVideoTaskItem[]) {
  return items.map((item, index) => {
    const grading = [item.certificationCompany || item.customGradingCompany, item.grade].filter(Boolean).join(" ");
    const facts = (item.facts ?? []).map((fact) => `${fact.label}: ${fact.value}`).join("; ");
    return `${index + 1}. ${item.title}${grading ? ` | spoken grade context: ${grading}` : ""}${facts ? ` | spoken factual context: ${facts}` : ""}`;
  }).join("\n");
}

/**
 * Builds a complete 16:9 TNN newsroom brief. The calling route validates the
 * trade eligibility and script before this reaches Manus; no price/value or
 * private logistics data is accepted by this contract.
 */
export function buildTnnVideoInstruction(input: TnnVideoTaskInput) {
  const anchorNames = input.anchorMode === "duo" ? "Max Tradebloski and Sidney Tradewell" : input.anchorMode === "max" ? "Max Tradebloski" : "Sidney Tradewell";
  const itemInsetInstruction = input.selectedItems.length
    ? "Starting when the anchor first begins describing each selected item, show that exact supplied item image in a clean picture-in-picture panel in the upper corner. Keep the anchor visible and do not cover the face. Advance the panel only as the script moves to the next item."
    : "Keep the anchor in the TNN newsroom for the report; no item insert is available.";
  const extraItemsInstruction = input.additionalItemsCount > 0
    ? `The script acknowledges ${input.additionalItemsCount} additional collector item${input.additionalItemsCount === 1 ? "" : "s"}. Do not invent or display any unprovided item for those additional items.`
    : "All selected item references are the complete visible item set for this report.";

  return [
    `Create one finished ${input.durationSeconds}-second, 16:9 Tradebilia News Network (TNN) breaking-news social video.`,
    "Use Seedance 2.5 Pro when available; otherwise use the best available Manus video model. Generate the final video with embedded professional newsroom dialogue and natural, accurate lip synchronization. Do not use external TTS.",
    "Editorial goal: celebrate a completed collector transaction and promote Tradebilia in a credible modern newsroom. This is not a financial report, sales pitch, valuation, or news claim outside the approved transaction.",
    `Anchors: ${anchorNames}. ${anchorDirection(input.anchorMode)}`,
    "Opening (first 2 seconds): one concise original TNN breaking-news sting with newsroom ambience and no commercial music bed. Then cut cleanly to the anchor desk. Keep the modern realistic newsroom, anchor identity, wardrobe, lighting, desk, and blue/red TNN visual language consistent through the finished video.",
    `Graphics: include the supplied official Tradebilia logo, a high newsroom headline strap reading 'BREAKING NEWS FROM TRADEBILIA', and an upper-corner TNN identifier. Use one understated scrolling lower ticker that repeats only this generic approved homepage tagline: '${input.tickerText}'. Do not place participant names, item values, prices, cash amounts, dates, locations, addresses, contact details, tracking/shipping information, certificate/serial numbers, or captions/subtitles on screen.`,
    itemInsetInstruction,
    extraItemsInstruction,
    "The visible item imagery must use only the supplied item reference images. Do not invent collectible items, labels, grades, brands, or facts. Item images may include their authentic visible packaging/labels; do not add synthetic text overlays that assert a grade or value.",
    "Use only the exact spoken script below. Preserve it verbatim, with natural pauses and speaker handoff for a duo report. Do not add any speech, call to action beyond the script, disclaimer, price, cash amount, or personal/private detail.",
    `Transaction type for visual context only: ${input.cashOnly ? "cash sale" : "collector trade"}. Do not display or speak any amount. The names are allowed in the spoken script only; never render them as text.`,
    "Approved selected-item context (reference only; do not add facts beyond the script):",
    itemReferenceLines(input.selectedItems) || "No item details supplied.",
    `Exact spoken script:\n${input.script}`,
    `Use this official Tradebilia logo asset as a visual reference whenever available: ${input.logoUrl}`,
    "Return one finished MP4 artifact suitable for private preview and manual review in the Tradebilia admin Social Content page. Do not publish it, contact social platforms, or perform any external action.",
  ].join("\n\n");
}

/** Legacy export retained for previously imported tests and callers. */
export const buildTradeVideoInstruction = buildTnnVideoInstruction;

export async function createTradeVideoTask(input: TnnVideoTaskInput) {
  const content: ManusContentPart[] = [
    { type: "text", text: buildTnnVideoInstruction(input) },
    ...input.imageUrls.slice(0, 6).map((file_url, index) => ({ type: "file" as const, file_url, filename: `trade-item-${index + 1}.jpg`, mime_type: "image/jpeg" })),
  ];
  const result = await manusRequest<{ task_id: string; task_url?: string }>("/v2/task.create", {
    method: "POST",
    body: JSON.stringify({ message: { content } }),
  });
  if (!result?.task_id) throw new Error("Manus did not return a video task ID.");
  return { taskId: result.task_id, taskUrl: result.task_url ?? `https://manus.im/app/${result.task_id}` };
}

export async function getTradeVideoTaskStatus(taskId: string) {
  const result = await manusRequest<{ messages?: ManusMessage[] }>(`/v2/task.listMessages?task_id=${encodeURIComponent(taskId)}&order=desc&limit=50`);
  const messages = result.messages ?? [];
  const statusMessage = messages.find((message) => message.type === "status_update");
  const failed = messages.find((message) => message.type === "error_message" || message.status === "failed");
  const attachments = messages.flatMap((message) => message.attachments ?? []);
  const video = attachments.find((attachment) => attachment.url && /video\/(mp4|webm)|\.(mp4|webm)(?:$|\?)/i.test(`${attachment.content_type ?? ""} ${attachment.filename ?? ""} ${attachment.url ?? ""}`));
  if (failed) return { status: "failed" as const, message: failed.error?.message || "Manus video generation failed.", videoUrl: null };
  if (video?.url) return { status: "completed" as const, message: "The TNN video is ready for private review.", videoUrl: video.url };
  const rawStatus = String(statusMessage?.status ?? "running").toLowerCase();
  if (rawStatus === "queued" || rawStatus === "pending") return { status: "queued" as const, message: "Manus accepted the TNN video task and is waiting to begin generation.", videoUrl: null };
  return { status: rawStatus === "completed" ? "completed" as const : "running" as const, message: "Manus is rendering the TNN newsroom video. You may safely navigate away; return to this draft to see the finished MP4.", videoUrl: null };
}
