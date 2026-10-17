import { ENV } from "./_core/env";

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

export function buildTradeVideoInstruction(input: {
  script: string;
  itemTitle: string;
  requesterName: string;
  recipientName: string;
  commentary: string;
  logoUrl: string;
}) {
  return [
    "Create one finished 25-second 16:9 breaking-news social video for Tradebilia.",
    "Use Seedance 2.5 Pro or the best available video model.",
    "Show a polished female American news anchor in a modern collectible-news studio delivering the supplied script verbatim with natural lip synchronization.",
    "Use the attached trade-item images only as visual references for brief supporting B-roll or an inset display; do not invent item facts, grades, prices, or identities.",
    "Use energetic but credible breaking-news pacing, tasteful studio graphics, readable lower thirds, and subtle newsroom motion.",
    "Do not publish the video, contact any social platform, or expose private account data.",
    `Trade item: ${input.itemTitle}. Requester: ${input.requesterName}. Recipient: ${input.recipientName}. Commentary: ${input.commentary}.`,
    `Exact spoken script: ${input.script}`,
    `Use this official Tradebilia logo as the brand reference when available: ${input.logoUrl}`,
    "Return a finished MP4 artifact suitable for preview in the Tradebilia admin Social Content page.",
  ].join("\n");
}

export async function createTradeVideoTask(input: {
  script: string;
  itemTitle: string;
  requesterName: string;
  recipientName: string;
  commentary: string;
  logoUrl: string;
  imageUrls: string[];
}) {
  const content: ManusContentPart[] = [
    { type: "text", text: buildTradeVideoInstruction(input) },
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
  if (video?.url) return { status: "completed" as const, message: "Video generation completed.", videoUrl: video.url };
  const rawStatus = String(statusMessage?.status ?? "running").toLowerCase();
  return { status: rawStatus === "completed" ? "completed" as const : "running" as const, message: "Manus is generating the video.", videoUrl: null };
}
