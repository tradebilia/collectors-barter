import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { like, sql } from "drizzle-orm";
import { listingPhotos, userProfiles, userReports } from "../drizzle/schema";
import { requireDb } from "./db";
import {
  getR2PublicMediaConfig,
  R2_PUBLIC_MEDIA_BUCKET,
  R2_PUBLIC_MEDIA_ORIGIN,
} from "./r2PublicMedia";

const R2_STATIC_BUCKET = "tradebilia-static";
const R2_STATIC_ORIGIN = "https://assets.tradebilia.com";
const STORAGE_HEALTH_TIMEOUT_MS = 7_500;
const MAX_BUCKET_SAMPLE_OBJECTS = 1_000;
const STATIC_SENTINELS = [
  `${R2_STATIC_ORIGIN}/tradebilia_final_transparent_8a1981e6.svg`,
  `${R2_STATIC_ORIGIN}/Background_23084d14.jpg`,
] as const;

type StaticR2Environment = {
  R2_STATIC_ACCESS_KEY_ID?: string;
  R2_STATIC_SECRET_ACCESS_KEY?: string;
  R2_STATIC_ENDPOINT?: string;
};

type R2ClientConfig = { accessKeyId: string; secretAccessKey: string; endpoint: string };

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createR2Client(config: R2ClientConfig) {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

function getStaticR2Config(env: StaticR2Environment = process.env as StaticR2Environment): R2ClientConfig | null {
  const accessKeyId = env.R2_STATIC_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_STATIC_SECRET_ACCESS_KEY?.trim();
  const endpoint = env.R2_STATIC_ENDPOINT?.trim().replace(/\/+$/, "");
  if (!accessKeyId || !secretAccessKey || !endpoint) return null;

  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".r2.cloudflarestorage.com")) return null;
  } catch {
    return null;
  }

  return { accessKeyId, secretAccessKey, endpoint };
}

async function summarizeBucket(config: R2ClientConfig | null, bucket: string) {
  if (!config) {
    return { credentialConfigured: false, reachable: false, sampleObjectCount: 0, sampleBytes: 0, truncated: false };
  }

  try {
    const result = await createR2Client(config).send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: MAX_BUCKET_SAMPLE_OBJECTS }));
    const objects = result.Contents ?? [];
    return {
      credentialConfigured: true,
      reachable: true,
      sampleObjectCount: objects.length,
      sampleBytes: objects.reduce((total, object) => total + (object.Size ?? 0), 0),
      truncated: Boolean(result.IsTruncated),
    };
  } catch {
    return { credentialConfigured: true, reachable: false, sampleObjectCount: 0, sampleBytes: 0, truncated: false };
  }
}

async function probePublicUrl(url: string | undefined) {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(STORAGE_HEALTH_TIMEOUT_MS) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getR2StorageHealth() {
  const db = await requireDb();
  const [listingStatsRows, avatarStatsRows, evidenceStatsRows, sampleListingRows] = await Promise.all([
    db.select({
      total: sql<number>`COUNT(*)`,
      r2: sql<number>`SUM(CASE WHEN ${listingPhotos.imageUrl} LIKE ${`${R2_PUBLIC_MEDIA_ORIGIN}/%`} THEN 1 ELSE 0 END)`,
      legacy: sql<number>`SUM(CASE WHEN ${listingPhotos.imageUrl} LIKE '/manus-storage/%' OR ${listingPhotos.imageUrl} LIKE 'https://tradebilia.manus.space/manus-storage/%' THEN 1 ELSE 0 END)`,
    }).from(listingPhotos),
    db.select({
      total: sql<number>`COUNT(*)`,
      r2: sql<number>`SUM(CASE WHEN ${userProfiles.avatarUrl} LIKE ${`${R2_PUBLIC_MEDIA_ORIGIN}/%`} THEN 1 ELSE 0 END)`,
      legacy: sql<number>`SUM(CASE WHEN ${userProfiles.avatarUrl} LIKE '/manus-storage/%' OR ${userProfiles.avatarUrl} LIKE 'https://tradebilia.manus.space/manus-storage/%' THEN 1 ELSE 0 END)`,
      empty: sql<number>`SUM(CASE WHEN ${userProfiles.avatarUrl} IS NULL OR ${userProfiles.avatarUrl} = '' THEN 1 ELSE 0 END)`,
    }).from(userProfiles),
    db.select({
      total: sql<number>`COUNT(*)`,
      withEvidence: sql<number>`SUM(CASE WHEN ${userReports.evidence} IS NOT NULL AND ${userReports.evidence} <> '' THEN 1 ELSE 0 END)`,
      publicR2References: sql<number>`SUM(CASE WHEN ${userReports.evidence} LIKE '%media.tradebilia.com%' OR ${userReports.evidence} LIKE '%assets.tradebilia.com%' THEN 1 ELSE 0 END)`,
    }).from(userReports),
    db.select({ url: listingPhotos.imageUrl })
      .from(listingPhotos)
      .where(like(listingPhotos.imageUrl, `${R2_PUBLIC_MEDIA_ORIGIN}/%`))
      .limit(1),
  ]);

  const listingStats = listingStatsRows[0];
  const avatarStats = avatarStatsRows[0];
  const evidenceStats = evidenceStatsRows[0];
  const publicMediaConfig = (() => {
    try {
      return getR2PublicMediaConfig();
    } catch {
      return null;
    }
  })();
  const staticConfig = getStaticR2Config();
  const [publicMediaBucket, staticBucket, samplePublicMediaAvailable, staticSentinelChecks] = await Promise.all([
    summarizeBucket(publicMediaConfig, R2_PUBLIC_MEDIA_BUCKET),
    summarizeBucket(staticConfig, R2_STATIC_BUCKET),
    probePublicUrl(sampleListingRows[0]?.url),
    Promise.all(STATIC_SENTINELS.map(probePublicUrl)),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    publicMedia: {
      listingPhotos: {
        total: numberValue(listingStats?.total),
        r2Hosted: numberValue(listingStats?.r2),
        legacyManaged: numberValue(listingStats?.legacy),
      },
      avatars: {
        totalProfiles: numberValue(avatarStats?.total),
        r2Hosted: numberValue(avatarStats?.r2),
        legacyManaged: numberValue(avatarStats?.legacy),
        empty: numberValue(avatarStats?.empty),
      },
      representativeUrlAvailable: sampleListingRows.length === 0 ? null : samplePublicMediaAvailable,
      bucket: publicMediaBucket,
    },
    staticAssets: {
      sentinelChecksPassed: staticSentinelChecks.filter(Boolean).length,
      sentinelChecksTotal: STATIC_SENTINELS.length,
      bucket: staticBucket,
    },
    privateEvidence: {
      reportCount: numberValue(evidenceStats?.total),
      reportsWithEvidence: numberValue(evidenceStats?.withEvidence),
      publicR2References: numberValue(evidenceStats?.publicR2References),
      protectedBoundaryIntact: numberValue(evidenceStats?.publicR2References) === 0,
    },
    limitations: {
      bucketSampleLimit: MAX_BUCKET_SAMPLE_OBJECTS,
      note: "Bucket figures are a read-only first-page sample. Full Cloudflare account usage remains available in the Cloudflare dashboard.",
    },
  };
}
