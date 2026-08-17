import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { listingPhotos, userProfiles } from "../drizzle/schema";
import { requireDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";
import {
  buildMigratedPublicMediaKey,
  downloadLegacyPublicMedia,
  isLegacyManagedMediaUrl,
  isR2PublicMediaUrl,
  putR2PublicMediaObject,
  verifyR2PublicMediaObject,
} from "./r2PublicMedia";

type MigrationCandidate =
  | { kind: "listing"; recordId: number; legacyKey: string; sourceUrl: string }
  | { kind: "avatar"; recordId: number; legacyKey: string; sourceUrl: string };

function requireAdmin(role: string | undefined) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}

async function getCandidates(): Promise<MigrationCandidate[]> {
  const db = await requireDb();
  const [photos, avatars] = await Promise.all([
    db.select({ id: listingPhotos.id, fileKey: listingPhotos.fileKey, imageUrl: listingPhotos.imageUrl })
      .from(listingPhotos)
      .orderBy(asc(listingPhotos.id)),
    db.select({ userId: userProfiles.userId, avatarKey: userProfiles.avatarKey, avatarUrl: userProfiles.avatarUrl })
      .from(userProfiles)
      .orderBy(asc(userProfiles.userId)),
  ]);

  const listingCandidates = photos
    .filter((photo) => isLegacyManagedMediaUrl(photo.imageUrl) && !isR2PublicMediaUrl(photo.imageUrl))
    .map((photo) => ({ kind: "listing" as const, recordId: photo.id, legacyKey: photo.fileKey, sourceUrl: photo.imageUrl }));
  const avatarCandidates = avatars
    .filter((avatar) => avatar.avatarKey && isLegacyManagedMediaUrl(avatar.avatarUrl) && !isR2PublicMediaUrl(avatar.avatarUrl))
    .map((avatar) => ({ kind: "avatar" as const, recordId: avatar.userId, legacyKey: avatar.avatarKey!, sourceUrl: avatar.avatarUrl! }));
  return [...listingCandidates, ...avatarCandidates];
}

async function getMigrationStatus() {
  const db = await requireDb();
  const [photos, avatars] = await Promise.all([
    db.select({ imageUrl: listingPhotos.imageUrl }).from(listingPhotos),
    db.select({ avatarUrl: userProfiles.avatarUrl }).from(userProfiles),
  ]);
  const pending = await getCandidates();
  const migratedListingPhotos = photos.filter((photo) => isR2PublicMediaUrl(photo.imageUrl)).length;
  const migratedAvatars = avatars.filter((avatar) => isR2PublicMediaUrl(avatar.avatarUrl)).length;
  return {
    pendingListingPhotos: pending.filter((item) => item.kind === "listing").length,
    pendingAvatars: pending.filter((item) => item.kind === "avatar").length,
    migratedListingPhotos,
    migratedAvatars,
    totalLegacyObjects: pending.length + migratedListingPhotos + migratedAvatars,
  };
}

async function migrateOne(candidate: MigrationCandidate) {
  const downloaded = await downloadLegacyPublicMedia(candidate.sourceUrl);
  const uploaded = await putR2PublicMediaObject({
    key: buildMigratedPublicMediaKey(candidate.kind, candidate.recordId, candidate.legacyKey),
    data: downloaded.data,
    contentType: downloaded.contentType,
  });
  await verifyR2PublicMediaObject(uploaded.url, downloaded.sha256);

  const db = await requireDb();
  if (candidate.kind === "listing") {
    await db.update(listingPhotos).set({ imageUrl: uploaded.url }).where(eq(listingPhotos.id, candidate.recordId));
  } else {
    await db.update(userProfiles).set({ avatarUrl: uploaded.url }).where(eq(userProfiles.userId, candidate.recordId));
  }

  return { kind: candidate.kind, recordId: candidate.recordId, legacyKey: candidate.legacyKey, r2Key: uploaded.key };
}

export const r2MediaRouter = router({
  getMigrationStatus: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    return getMigrationStatus();
  }),
  migrateNextBatch: protectedProcedure
    .input(z.object({ confirmation: z.literal("MIGRATE_PUBLIC_MEDIA"), batchSize: z.number().int().min(1).max(5).default(5) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const candidates = (await getCandidates()).slice(0, input.batchSize);
      const migrated: Array<{ kind: "listing" | "avatar"; recordId: number; legacyKey: string; r2Key: string }> = [];
      const failed: Array<{ kind: "listing" | "avatar"; recordId: number; message: string }> = [];

      for (const candidate of candidates) {
        try {
          migrated.push(await migrateOne(candidate));
        } catch (error) {
          failed.push({
            kind: candidate.kind,
            recordId: candidate.recordId,
            message: error instanceof Error ? error.message : "Migration failed.",
          });
        }
      }
      return { migrated, failed, status: await getMigrationStatus() };
    }),
});
