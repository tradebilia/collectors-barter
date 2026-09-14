import { z } from "zod";
import { sql, and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { tradeProposals, listings, tradeProposalItems, tradeTrackingNumbers, tradePayments } from "../drizzle/schema";
import { lookupDhlTracking } from "./dhlTracking";
import { lookupFedexTracking } from "./fedexTracking";
import { lookupUpsTracking } from "./upsTracking";
import { lookupUspsTracking } from "./uspsTracking";
import { reviewUspsTrackingEvidence } from "./uspsTrackingEvidence";
import { getPaymentVerificationObligations } from "./paymentAuthorization";
import { hasTrackingForEveryItem, haveAllCashPaymentsBeenSent } from "./tradeFulfillment";

const carrierSchema = z.enum(["USPS", "UPS", "FedEx", "DHL"]);

function isInvalidCarrierResult(result: any, carrier: string) {
  const status = String(result?.status ?? '').trim().toLowerCase();
  const summary = String(result?.statusSummary ?? '').trim().toLowerCase();
  if (carrier === 'USPS' && (status === 'tracking not available' || summary === 'tracking not available')) return true;
  return [status, summary].some((value) => /tracking not available|not found|invalid tracking|unable to locate|no tracking information/.test(value));
}

export const shippingTrackingRouter = router({
  lookup: protectedProcedure
    .input(z.object({
      carrier: carrierSchema,
      trackingNumber: z.string().trim().min(7).max(40),
    }))
    .mutation(async ({ input }) => {
      switch (input.carrier) {
        case "USPS":
          return lookupUspsTracking(input.trackingNumber);
        case "UPS":
          return lookupUpsTracking(input.trackingNumber);
        case "FedEx":
          return lookupFedexTracking(input.trackingNumber);
        case "DHL":
          return lookupDhlTracking(input.trackingNumber);
      }
    }),
  validateForTrade: protectedProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      listingId: z.number().int().positive(),
      carrier: carrierSchema,
      trackingNumber: z.string().trim().min(7).max(40),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [proposal] = await db.select({ requesterId: tradeProposals.requesterId, recipientId: tradeProposals.recipientId })
        .from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal || ![proposal.requesterId, proposal.recipientId].includes(ctx.user.id)) {
        throw new Error('Trade not found or access denied.');
      }
      const [listing] = await db.select({ ownerId: listings.ownerId }).from(listings).where(eq(listings.id, input.listingId)).limit(1);
      if (!listing || listing.ownerId !== ctx.user.id) {
        throw new Error('You can only validate tracking for an item you are sending.');
      }
      let result: any;
      switch (input.carrier) {
        case "USPS": result = await lookupUspsTracking(input.trackingNumber); break;
        case "UPS": result = await lookupUpsTracking(input.trackingNumber); break;
        case "FedEx": result = await lookupFedexTracking(input.trackingNumber); break;
        case "DHL": result = await lookupDhlTracking(input.trackingNumber); break;
      }
      const valid = !isInvalidCarrierResult(result, input.carrier);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const details = `tracking_validation:${JSON.stringify({ listingId: input.listingId, carrier: input.carrier, trackingNumber: input.trackingNumber, validationStatus: valid ? 'valid' : 'invalid', message: valid ? 'Valid Tracking Number has been submitted' : 'Invalid Tracking Number submitted', validatedAt: now })}`;
      await db.execute(sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${ctx.user.id}, ${ctx.user.name || ctx.user.username || 'Member'}, 'tracking_submitted', ${details}, ${now})`);
      return { ...result, validationStatus: valid ? 'valid' : 'invalid', validationMessage: valid ? 'Valid Tracking Number has been submitted' : 'Invalid Tracking Number submitted' };
    }),
  reviewUspsEvidenceForTrade: protectedProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      listingId: z.number().int().positive(),
      trackingNumber: z.string().trim().min(4).max(40),
      imageDataUrl: z.string().max(4_500_000).regex(/^data:image\/(?:png|jpeg|webp);base64,/, 'Provide a PNG, JPEG, or WebP screenshot.'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal || ![proposal.requesterId, proposal.recipientId].includes(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Trade not found or access denied." });
      }
      if (proposal.status !== "shipping") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "USPS evidence can only be reviewed during the shipping stage." });
      }

      const [listing] = await db.select({ ownerId: listings.ownerId }).from(listings).where(eq(listings.id, input.listingId)).limit(1);
      if (!listing || listing.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only review USPS evidence for an item you are sending." });
      }

      const review = await reviewUspsTrackingEvidence({ trackingNumber: input.trackingNumber, imageDataUrl: input.imageDataUrl });
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const actorName = ctx.user.name || ctx.user.username || "Member";

      if (review.classification === "tracking_not_available") {
        const details = `tracking_validation:${JSON.stringify({ listingId: input.listingId, carrier: "USPS", trackingNumber: input.trackingNumber, validationStatus: "invalid", message: "Invalid Tracking Number submitted", validatedAt: now, evidence: "user-approved USPS view" })}`;
        await db.execute(sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${ctx.user.id}, ${actorName}, 'tracking_submitted', ${details}, ${now})`);
        return { ...review, validationStatus: "invalid" as const, validationMessage: "Invalid Tracking Number submitted", retention: "Not stored by Tradebilia" };
      }

      if (review.classification !== "recognized_result") {
        return { ...review, validationStatus: null, validationMessage: "USPS evidence needs review. Tracking was not submitted.", retention: "Not stored by Tradebilia" };
      }

      const details = `tracking_validation:${JSON.stringify({ listingId: input.listingId, carrier: "USPS", trackingNumber: input.trackingNumber, validationStatus: "valid", message: "Valid Tracking Number has been submitted", validatedAt: now, evidence: "user-approved USPS view" })}`;
      await db.execute(sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${ctx.user.id}, ${actorName}, 'tracking_submitted', ${details}, ${now})`);

      const proposalItemRows = await db.select({ listingId: tradeProposalItems.offeredListingId }).from(tradeProposalItems).where(eq(tradeProposalItems.proposalId, input.proposalId));
      const tradeListingIds = [...new Set([proposal.requestedListingId, ...proposalItemRows.map((item) => item.listingId)].filter((listingId): listingId is number => Number.isInteger(listingId)))];
      const tradeListings = tradeListingIds.length ? await db.select({ id: listings.id, ownerId: listings.ownerId }).from(listings).where(inArray(listings.id, tradeListingIds)) : [];
      const trackingRows = await db.select({ userId: tradeTrackingNumbers.userId, listingId: tradeTrackingNumbers.listingId }).from(tradeTrackingNumbers).where(eq(tradeTrackingNumbers.proposalId, input.proposalId));
      const expectedListingIdsByUser = new Map<number, number[]>([
        [Number(proposal.requesterId), tradeListings.filter((listing) => listing.ownerId === proposal.requesterId).map((listing) => listing.id)],
        [Number(proposal.recipientId), tradeListings.filter((listing) => listing.ownerId === proposal.recipientId).map((listing) => listing.id)],
      ]);
      const allParticipantsSubmittedTracking = [Number(proposal.requesterId), Number(proposal.recipientId)].every((participantId) => hasTrackingForEveryItem(
        expectedListingIdsByUser.get(participantId) ?? [],
        trackingRows.filter((tracking) => Number(tracking.userId) === participantId).map((tracking) => Number(tracking.listingId)),
      ));
      const cashObligations = getPaymentVerificationObligations(proposal);
      const paymentRows = cashObligations.length
        ? await db.select({ payerId: tradePayments.payerId, status: tradePayments.status }).from(tradePayments).where(and(eq(tradePayments.proposalId, input.proposalId), inArray(tradePayments.payerId, cashObligations.map((obligation) => obligation.payerId))))
        : [];
      const shouldAdvance = allParticipantsSubmittedTracking && haveAllCashPaymentsBeenSent(cashObligations, paymentRows);
      await db.execute(shouldAdvance
        ? sql`UPDATE tradeProposals SET status = 'shipped', shippedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        : sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`);

      return { ...review, validationStatus: "valid" as const, validationMessage: "Valid Tracking Number has been submitted", retention: "Not stored by Tradebilia" };
    }),
});
