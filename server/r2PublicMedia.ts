import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";

export const R2_PUBLIC_MEDIA_BUCKET = "tradebilia-public-media";
export const R2_PUBLIC_MEDIA_ORIGIN = "https://media.tradebilia.com";
export const MAX_NEW_R2_PUBLIC_MEDIA_BYTES = {
  listing: 10 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
} as const;
const LEGACY_MEDIA_ORIGIN = "https://tradebilia.manus.space";
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type R2Environment = {
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ENDPOINT?: string;
};

export type UploadedPublicMedia = {
  key: string;
  url: string;
  sha256: string;
  size: number;
};

export function getR2PublicMediaConfig(env: R2Environment = process.env as unknown as R2Environment) {
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const endpoint = env.R2_ENDPOINT?.trim().replace(/\/+$/, "");

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("Cloudflare R2 public-media credentials are not configured.");
  }

  const parsedEndpoint = new URL(endpoint);
  if (parsedEndpoint.protocol !== "https:" || !parsedEndpoint.hostname.endsWith(".r2.cloudflarestorage.com")) {
    throw new Error("R2_ENDPOINT must be an HTTPS Cloudflare R2 S3 endpoint.");
  }

  return { accessKeyId, secretAccessKey, endpoint };
}

function getClient(env: R2Environment = process.env as unknown as R2Environment) {
  const config = getR2PublicMediaConfig(env);
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function encodeKeyForUrl(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function safeFilename(name: string) {
  const base = name.split("/").pop() || "image";
  return base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "image";
}

function assertImageMimeType(contentType: string) {
  const normalized = contentType.split(";", 1)[0]?.trim().toLowerCase() || "";
  if (!IMAGE_MIME_TYPES.has(normalized)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF public-media uploads are allowed.");
  }
  return normalized;
}

function matchesImageSignature(data: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (contentType === "image/png") return data.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => data[index] === byte);
  if (contentType === "image/gif") return data.length >= 6 && (Buffer.from(data.subarray(0, 6)).toString("ascii") === "GIF87a" || Buffer.from(data.subarray(0, 6)).toString("ascii") === "GIF89a");
  return data.length >= 12
    && Buffer.from(data.subarray(0, 4)).toString("ascii") === "RIFF"
    && Buffer.from(data.subarray(8, 12)).toString("ascii") === "WEBP";
}

export function validateR2PublicMediaUpload(input: {
  data: Uint8Array;
  contentType: string;
  kind?: "listing" | "avatar";
}) {
  const contentType = assertImageMimeType(input.contentType);
  const data = Buffer.from(input.data);
  if (!data.length) throw new Error("Public-media uploads cannot be empty.");
  if (input.kind && data.length > MAX_NEW_R2_PUBLIC_MEDIA_BYTES[input.kind]) {
    throw new Error(`New ${input.kind} images exceed the ${MAX_NEW_R2_PUBLIC_MEDIA_BYTES[input.kind] / (1024 * 1024)}MB limit.`);
  }
  if (!matchesImageSignature(data, contentType)) {
    throw new Error("Public-media bytes do not match the declared image type.");
  }
  return { data, contentType };
}

export function buildR2PublicMediaUrl(key: string) {
  return `${R2_PUBLIC_MEDIA_ORIGIN}/${encodeKeyForUrl(key)}`;
}

export function isR2PublicMediaUrl(url: string | null | undefined) {
  return Boolean(url?.startsWith(`${R2_PUBLIC_MEDIA_ORIGIN}/`));
}

export function isLegacyManagedMediaUrl(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith("/manus-storage/") || url.startsWith(`${LEGACY_MEDIA_ORIGIN}/manus-storage/`);
}

export function getLegacyMediaUrl(url: string) {
  if (url.startsWith("/manus-storage/")) return `${LEGACY_MEDIA_ORIGIN}${url}`;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "tradebilia.manus.space" || !parsed.pathname.startsWith("/manus-storage/")) {
    throw new Error("Legacy media source is not a recognized Tradebilia managed-storage URL.");
  }
  return parsed.toString();
}

export function buildNewPublicMediaKey(kind: "listing" | "avatar", ownerId: number, filename: string) {
  const suffix = randomUUID().replace(/-/g, "");
  return `new/${kind}s/${ownerId}/${Date.now()}-${suffix}-${safeFilename(filename)}`;
}

export function buildMigratedPublicMediaKey(kind: "listing" | "avatar", recordId: number, legacyKey: string) {
  return `legacy/${kind}s/${recordId}/${safeFilename(legacyKey)}`;
}

export async function putR2PublicMediaObject(input: {
  key: string;
  data: Uint8Array;
  contentType: string;
  env?: R2Environment;
}) : Promise<UploadedPublicMedia> {
  const { contentType, data } = validateR2PublicMediaUpload(input);
  const client = getClient(input.env);
  await client.send(new PutObjectCommand({
    Bucket: R2_PUBLIC_MEDIA_BUCKET,
    Key: input.key,
    Body: data,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return {
    key: input.key,
    url: buildR2PublicMediaUrl(input.key),
    sha256: createHash("sha256").update(data).digest("hex"),
    size: data.length,
  };
}

export async function uploadNewPublicMedia(input: {
  kind: "listing" | "avatar";
  ownerId: number;
  filename: string;
  data: Uint8Array;
  contentType: string;
}) {
  validateR2PublicMediaUpload({
    kind: input.kind,
    data: input.data,
    contentType: input.contentType,
  });
  return putR2PublicMediaObject({
    key: buildNewPublicMediaKey(input.kind, input.ownerId, input.filename),
    data: input.data,
    contentType: input.contentType,
  });
}

export async function downloadLegacyPublicMedia(sourceUrl: string) {
  const response = await fetch(getLegacyMediaUrl(sourceUrl), { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Legacy media download failed (${response.status}).`);
  const contentType = assertImageMimeType(response.headers.get("content-type") || "");
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length === 0) throw new Error("Legacy media download returned no bytes.");
  return { data, contentType, sha256: createHash("sha256").update(data).digest("hex") };
}

export async function verifyR2PublicMediaObject(url: string, expectedSha256: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`R2 public-media verification failed (${response.status}).`);
  const contentType = assertImageMimeType(response.headers.get("content-type") || "");
  const data = Buffer.from(await response.arrayBuffer());
  const actualSha256 = createHash("sha256").update(data).digest("hex");
  if (actualSha256 !== expectedSha256) throw new Error("R2 public-media verification checksum mismatch.");
  return { contentType, size: data.length, sha256: actualSha256 };
}
