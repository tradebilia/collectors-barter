import { z } from "zod";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { tradeProposals, listings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { lookupDhlTracking } from "./dhlTracking";
import { lookupFedexTracking } from "./fedexTracking";
import { lookupUpsTracking } from "./upsTracking";
import { lookupUspsTracking } from "./uspsTracking";

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
});
