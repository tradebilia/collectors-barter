/**
 * Trade Flow Router — Full Implementation
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md
 * Reference: COMPLETE_TRADE_FLOW_SPECIFICATION.md
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { requireDb } from "./db";
import {
  users,
  userProfiles,
  listings,
  listingPhotos,
  tradeProposals,
  tradeProposalItems,
  tradeMessages,
  tradeReviews,
} from "../drizzle/schema";
import { eq, sql, desc, or, and, inArray, asc } from "drizzle-orm";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const initiateTradeSchema = z.object({
  listingId: z.number().int().positive(),
  message: z.string().optional(),
});

const declineTradeSchema = z.object({
  proposalId: z.number().int().positive(),
  reason: z.string().optional(),
});

const sendProposalSchema = z.object({
  proposalId: z.number().int().positive(),
  offeredListingIds: z.array(z.number().int().positive()),
  cashFromProposer: z.number().min(0).optional(),
  cashFromRecipient: z.number().min(0).optional(),
  message: z.string().optional(),
});

const acceptProposalSchema = z.object({
  proposalId: z.number().int().positive(),
});

const rejectProposalSchema = z.object({
  proposalId: z.number().int().positive(),
  reason: z.string().optional(),
});

const submitTrackingSchema = z.object({
  proposalId: z.number().int().positive(),
  trackingNumbers: z.array(z.object({
    listingId: z.number().int().positive(),
    carrier: z.enum(['USPS', 'UPS', 'FedEx', 'DHL', 'Other']),
    carrierOther: z.string().max(100).optional(),
    trackingNumber: z.string().min(1).max(50),
  })),
});

const confirmReceiptSchema = z.object({
  proposalId: z.number().int().positive(),
  confirmationType: z.enum(['received', 'damaged']).default('received'),
});

const fileComplaintSchema = z.object({
  proposalId: z.number().int().positive(),
  description: z.string().min(1),
  complaintType: z.enum(['damaged', 'missing', 'notAsDescribed', 'other']),
  photoUrls: z.array(z.string()).max(5).optional(),
});

const leaveReviewSchema = z.object({
  proposalId: z.number().int().positive(),
  tradeExperienceRating: z.number().int().min(0).max(5),
  itemConditionRating: z.number().int().min(0).max(5),
  communicationRating: z.number().int().min(0).max(5),
  shippingSpeedRating: z.number().int().min(0).max(5),
  review: z.string().optional(),
  photoUrls: z.array(z.string()).max(5).optional(),
});

const getTradeAlertsSchema = z.object({
  folder: z.enum(['negotiating', 'accepted', 'shipped', 'declined', 'completed']),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
  search: z.string().optional(),
});

const middleManRequestSchema = z.object({
  proposalId: z.number().int().positive(),
  action: z.enum(['request', 'approve', 'deselect']),
});

const generateVotingLinkSchema = z.object({
  proposalId: z.number().int().positive(),
});

const castVoteSchema = z.object({
  linkToken: z.string().min(1),
  verdict: z.enum(['steal', 'fair', 'pass']),
  comment: z.string().optional(),
});

const savePrivateNoteSchema = z.object({
  proposalId: z.number().int().positive(),
  noteContent: z.string(),
});

const sendTradeMessageSchema = z.object({
  proposalId: z.number().int().positive(),
  message: z.string().min(1),
});

// ============================================================================
// HELPER: Generate sequential trade reference number
// ============================================================================

async function generateTradeRefNumber(): Promise<string> {
  const db = await requireDb();
  const [result] = await db.execute(
    sql`SELECT MAX(CAST(SUBSTRING(tradeReferenceNumber, 4) AS UNSIGNED)) as maxNum FROM tradeProposals WHERE tradeReferenceNumber IS NOT NULL`
  );
  const maxNum = (result as any)?.[0]?.maxNum ?? 0;
  const nextNum = maxNum + 1;
  return `TR-${String(nextNum).padStart(6, '0')}`;
}

// ============================================================================
// HELPER: Get status mapping for folder queries
// ============================================================================

function getFolderStatusFilter(folder: string): string[] {
  switch (folder) {
    case 'negotiating': return ['pending', 'negotiating'];
    case 'accepted': return ['accepted'];
    case 'shipped': return ['shipped'];
    case 'declined': return ['declined', 'cancelled'];
    case 'completed': return ['completed'];
    default: return ['pending', 'negotiating'];
  }
}

// ============================================================================
// TRADE FLOW ROUTER
// ============================================================================

export const tradeFlowRouter = router({

  // ==========================================================================
  // STAGE 1: TRADE INITIATION
  // ==========================================================================

  initiateTradeProposal: protectedProcedure
    .input(initiateTradeSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      // 1. Check if initiator is suspended
      const [initiator] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if ((initiator as any)?.isSuspended) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Trading is disabled for suspended accounts' });
      }

      // 2. Validate listing exists AND is active
      const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      if (!listing.isActive || listing.status !== 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This listing is no longer available for trading' });
      }

      // 3. No self-trade
      if (listing.ownerId === userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot trade with yourself' });
      }

      // 4. Check if recipient (listing owner) is suspended
      const [recipient] = await db.select().from(users).where(eq(users.id, listing.ownerId)).limit(1);
      if ((recipient as any)?.isSuspended) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This user\'s account is currently suspended' });
      }

      // 5. Generate trade reference number
      const tradeRef = await generateTradeRefNumber();

      // 6. Create trade proposal
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.insert(tradeProposals).values({
        requesterId: userId,
        recipientId: listing.ownerId,
        requestedListingId: input.listingId,
        note: input.message || null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      // Get the inserted ID
      const [inserted] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const proposalId = (inserted as any)?.[0]?.id;

      // 7. Set trade reference number, initiatorMessage, and lastActivityAt
      await db.execute(
        sql`UPDATE tradeProposals SET tradeReferenceNumber = ${tradeRef}, initiatorMessage = ${input.message || null}, lastActivityAt = ${now} WHERE id = ${proposalId}`
      );

      // 8. Create structured trade alert for recipient
      const alertMessage = JSON.stringify({
        text: `${ctx.user.name || initiator?.username || 'A user'} is interested in your item`,
        itemName: listing.title,
        itemId: listing.id,
        tradeRef: tradeRef,
        initiatorMessage: input.message || null,
      });
      await db.execute(
        sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${proposalId}, ${listing.ownerId}, 'initiated', ${alertMessage}, ${now})`
      );

      // 7. Log to admin log
      await db.execute(
        sql`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${proposalId}, 'initiated', ${userId}, ${'Trade initiated'}, ${now})`
      );

      return { proposalId, tradeReferenceNumber: tradeRef };
    }),

  declineTradeProposal: protectedProcedure
    .input(declineTradeSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      // Validate user is recipient
      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        sql`UPDATE tradeProposals SET status = 'declined', declineReason = ${input.reason || null}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );

      // Alert the other party
      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      await db.execute(
        sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'declined', 'Trade has been declined', ${now})`
      );

      return { success: true };
    }),

  cancelTrade: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      if (!['pending', 'negotiating'].includes(proposal.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only cancel trades in pending or negotiating status' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        sql`UPDATE tradeProposals SET status = 'cancelled', lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );

      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      await db.execute(
        sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'cancelled', 'Trade has been cancelled', ${now})`
      );

      return { success: true };
    }),

  // ==========================================================================
  // STAGE 2: NEGOTIATION
  // ==========================================================================

  enterWarRoom: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      // Transition from pending to negotiating
      if (proposal.status === 'pending') {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'negotiating', negotiatingAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      }

      return { success: true };
    }),

  sendTradeProposal: protectedProcedure
    .input(sendProposalSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Clear existing proposal items from this user and re-insert
      await db.execute(
        sql`DELETE FROM tradeProposalItems WHERE proposalId = ${input.proposalId} AND offeredListingId IN (SELECT id FROM listings WHERE ownerId = ${userId})`
      );

      // Insert new items
      for (const listingId of input.offeredListingIds) {
        await db.insert(tradeProposalItems).values({
          proposalId: input.proposalId,
          offeredListingId: listingId,
          createdAt: now,
        });
      }

      // Update cash fields
      if (input.cashFromProposer !== undefined || input.cashFromRecipient !== undefined) {
        await db.execute(
          sql`UPDATE tradeProposals SET cashFromRequester = ${input.cashFromProposer || 0}, cashFromRecipient = ${input.cashFromRecipient || 0}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      } else {
        await db.execute(
          sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      }

      // Send system message
      if (input.message) {
        await db.insert(tradeMessages).values({
          proposalId: input.proposalId,
          senderId: userId,
          message: input.message,
          createdAt: now,
        });
      }

      // Alert other party
      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      await db.execute(
        sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'counterProposal', 'A new proposal has been submitted', ${now})`
      );

      return { success: true };
    }),

  acceptTradeProposal: protectedProcedure
    .input(acceptProposalSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      if (!['negotiating'].includes(proposal.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trade must be in negotiating status to accept' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;

      // 72-hour mutual acceptance: Check if the other party has already accepted
      const [existingAcceptance] = await db.execute(
        sql`SELECT id FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND userId = ${otherUserId} AND confirmationType = 'accepted'`
      );
      const otherHasAccepted = ((existingAcceptance as unknown as any[])?.length || 0) > 0;

      if (otherHasAccepted) {
        // Both have now accepted — move to 'accepted' status and lock items
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'accepted', acceptedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
        // Lock all items in this trade (mark as 'traded' in listings)
        await db.execute(
          sql`UPDATE listings SET status = 'traded' WHERE id IN (SELECT offeredListingId FROM tradeProposalItems WHERE proposalId = ${input.proposalId})`
        );
        await db.execute(
          sql`UPDATE listings SET status = 'traded' WHERE id = ${proposal.requestedListingId}`
        );
        await db.execute(
          sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'accepted', 'Both parties have accepted! Trade is now locked. Time to ship.', ${now})`
        );
        await db.execute(
          sql`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${input.proposalId}, 'accepted', ${userId}, 'Mutual acceptance — trade locked', ${now})`
        );
        // Clean up the acceptance records
        await db.execute(
          sql`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType = 'accepted'`
        );

        // Q2 + Q14: Auto-cancel all other pending/negotiating proposals involving these items
        // Cancel proposals where the requestedListingId is now traded
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Item is no longer available (traded in another proposal)', updatedAt = ${now} WHERE id != ${input.proposalId} AND requestedListingId = ${proposal.requestedListingId} AND status IN ('pending', 'negotiating')`
        );
        // Cancel proposals where any offered item is now traded
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'An item in this proposal is no longer available', updatedAt = ${now} WHERE id != ${input.proposalId} AND status IN ('pending', 'negotiating') AND id IN (SELECT proposalId FROM tradeProposalItems WHERE offeredListingId IN (SELECT offeredListingId FROM tradeProposalItems WHERE proposalId = ${input.proposalId}))`
        );

        return { success: true, mutualAcceptance: true };
      } else {
        // First acceptance — record it and notify other party (72-hour window)
        await db.execute(
          sql`INSERT INTO tradeReceiptConfirmation (proposalId, userId, confirmationType, confirmedAt) VALUES (${input.proposalId}, ${userId}, 'accepted', ${now})`
        );
        await db.execute(
          sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
        await db.execute(
          sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'accepted', 'Your trade partner has accepted! You have 72 hours to confirm.', ${now})`
        );
        await db.execute(
          sql`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${input.proposalId}, 'accepted', ${userId}, 'First acceptance — awaiting mutual confirmation', ${now})`
        );
        return { success: true, mutualAcceptance: false };
      }
    }),

  rejectTradeProposal: protectedProcedure
    .input(rejectProposalSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Add rejection message to timeline
      await db.insert(tradeMessages).values({
        proposalId: input.proposalId,
        senderId: userId,
        message: input.reason || 'Proposal rejected',
        createdAt: now,
      });
      // Update messageType via raw SQL since schema doesn't have the new column yet
      await db.execute(sql`UPDATE tradeMessages SET messageType = 'rejection' WHERE proposalId = ${input.proposalId} AND senderId = ${userId} ORDER BY id DESC LIMIT 1`);

      await db.execute(
        sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );

      return { success: true };
    }),

  // ==========================================================================
  // STAGE 3: SHIPPING & VERIFICATION
  // ==========================================================================

  submitTrackingNumbers: protectedProcedure
    .input(submitTrackingSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      for (const tracking of input.trackingNumbers) {
        await db.execute(
          sql`INSERT INTO tradeTrackingNumbers (proposalId, userId, listingId, carrier, carrierOther, trackingNumber, submittedAt) VALUES (${input.proposalId}, ${userId}, ${tracking.listingId}, ${tracking.carrier}, ${tracking.carrierOther || null}, ${tracking.trackingNumber}, ${now})`
        );
      }

      // Check if both parties have submitted tracking
      const [trackingCounts] = await db.execute(
        sql`SELECT COUNT(DISTINCT userId) as userCount FROM tradeTrackingNumbers WHERE proposalId = ${input.proposalId}`
      );
      const bothShipped = (trackingCounts as any)?.[0]?.userCount >= 2;

      if (bothShipped) {
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'shipped', shippedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      } else {
        await db.execute(
          sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      }

      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      await db.execute(
        sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'shipped', 'Tracking number submitted', ${now})`
      );

      return { success: true };
    }),

  confirmItemsReceived: protectedProcedure
    .input(confirmReceiptSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await db.execute(
        sql`INSERT INTO tradeReceiptConfirmation (proposalId, userId, confirmationType, confirmedAt) VALUES (${input.proposalId}, ${userId}, ${input.confirmationType}, ${now})`
      );

      // Check if both confirmed receipt (exclude 'accepted' type which is used for mutual acceptance)
      const [confirmCounts] = await db.execute(
        sql`SELECT COUNT(DISTINCT userId) as userCount FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType IN ('received', 'damaged')`
      );
      const bothConfirmed = (confirmCounts as any)?.[0]?.userCount >= 2;

      if (bothConfirmed) {
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'completed', completedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      }

      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      await db.execute(
        sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'received', 'Items have been confirmed received', ${now})`
      );

      return { success: true };
    }),

  fileComplaint: protectedProcedure
    .input(fileComplaintSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        sql`INSERT INTO tradeComplaints (proposalId, complaintUserId, description, complaintType, photos, createdAt) VALUES (${input.proposalId}, ${userId}, ${input.description}, ${input.complaintType}, ${JSON.stringify(input.photoUrls || [])}, ${now})`
      );

      await db.execute(
        sql`UPDATE tradeProposals SET status = 'disputed', lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );

      return { success: true };
    }),

  // ==========================================================================
  // STAGE 4: FEEDBACK & RATINGS
  // ==========================================================================

  leaveTradeReview: protectedProcedure
    .input(leaveReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });

      const revieweeId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      const overallRating = ((input.tradeExperienceRating + input.itemConditionRating + input.communicationRating + input.shippingSpeedRating) / 4).toFixed(1);

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.insert(tradeReviews).values({
        proposalId: input.proposalId,
        reviewerId: userId,
        revieweeId: revieweeId,
        rating: Math.round(parseFloat(overallRating)),
        review: input.review || null,
        createdAt: now,
      });

      // Set sub-ratings via raw SQL
      await db.execute(
        sql`UPDATE tradeReviews SET tradeExperienceRating = ${input.tradeExperienceRating}, itemConditionRating = ${input.itemConditionRating}, communicationRating = ${input.communicationRating}, shippingSpeedRating = ${input.shippingSpeedRating}, overallRating = ${overallRating}, isVisible = 0 WHERE proposalId = ${input.proposalId} AND reviewerId = ${userId}`
      );

      // Check if both have reviewed (blind review system)
      const [reviewCounts] = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM tradeReviews WHERE proposalId = ${input.proposalId}`
      );
      if ((reviewCounts as any)?.[0]?.cnt >= 2) {
        await db.execute(
          sql`UPDATE tradeReviews SET isVisible = 1 WHERE proposalId = ${input.proposalId}`
        );
      }

      return { success: true };
    }),

  // ==========================================================================
  // QUERIES: TRADE HUB & WAR ROOM DATA
  // ==========================================================================

  getTradeAlerts: protectedProcedure
    .input(getTradeAlertsSchema)
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const statuses = getFolderStatusFilter(input.folder);

      // Build the status filter SQL
      const statusPlaceholders = statuses.map(s => `'${s}'`).join(',');

      const trades = await db.execute(
        sql`SELECT 
          tp.id,
          tp.requesterId,
          tp.recipientId,
          tp.requestedListingId,
          tp.status,
          tp.tradeReferenceNumber,
          tp.lastActivityAt,
          tp.cashFromRequester,
          tp.cashFromRecipient,
          tp.createdAt,
          tp.note,
          l.title as listingTitle,
          l.estimatedValue as listingValue,
          l.category as listingCategory,
          (SELECT imageUrl FROM listingPhotos WHERE listingId = l.id ORDER BY sortOrder ASC LIMIT 1) as listingImage,
          CASE WHEN tp.requesterId = ${userId} THEN tp.recipientId ELSE tp.requesterId END as otherUserId,
          CASE WHEN tp.requesterId = ${userId} THEN 'sent' ELSE 'received' END as direction,
          (SELECT COUNT(*) FROM tradeAlerts WHERE proposalId = tp.id AND recipientUserId = ${userId} AND isRead = 0) as unreadCount
        FROM tradeProposals tp
        LEFT JOIN listings l ON l.id = tp.requestedListingId
        WHERE (tp.requesterId = ${userId} OR tp.recipientId = ${userId})
          AND tp.status IN (${sql.raw(statusPlaceholders)})
        ORDER BY tp.lastActivityAt DESC, tp.createdAt DESC
        LIMIT ${input.limit} OFFSET ${input.offset}`
      );

      const tradeList = (trades as any)?.[0] || [];

      // Get other user details for each trade
      const otherUserIds = Array.from(new Set(tradeList.map((t: any) => t.otherUserId))).filter(Boolean);
      let userMap: Record<number, any> = {};

      if (otherUserIds.length > 0) {
        const userIds = otherUserIds.map(id => `${id}`).join(',');
        const [usersResult] = await db.execute(
          sql`SELECT u.id, u.username, u.name, up.displayName, up.avatarUrl,
            (SELECT AVG(rating) FROM tradeReviews WHERE revieweeId = u.id) as avgRating,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = u.id) as reviewCount
          FROM users u
          LEFT JOIN userProfiles up ON up.userId = u.id
          WHERE u.id IN (${sql.raw(userIds)})`
        );
        for (const user of (usersResult as unknown as any[])) {
          userMap[user.id] = user;
        }
      }

      // Get item counts for each trade
      const proposalIds = tradeList.map((t: any) => t.id);
      let itemCountMap: Record<number, number> = {};
      if (proposalIds.length > 0) {
        const pIds = proposalIds.join(',');
        const [itemCounts] = await db.execute(
          sql`SELECT proposalId, COUNT(*) as itemCount FROM tradeProposalItems WHERE proposalId IN (${sql.raw(pIds)}) GROUP BY proposalId`
        );
        for (const ic of (itemCounts as unknown as any[])) {
          itemCountMap[ic.proposalId] = ic.itemCount;
        }
      }

      return {
        trades: tradeList.map((t: any) => ({
          id: t.id,
          tradeReferenceNumber: t.tradeReferenceNumber,
          status: t.status,
          direction: t.direction,
          lastActivityAt: t.lastActivityAt,
          createdAt: t.createdAt,
          unreadCount: t.unreadCount || 0,
          cashFromRequester: t.cashFromRequester,
          cashFromRecipient: t.cashFromRecipient,
          note: t.note,
          listing: {
            id: t.requestedListingId,
            title: t.listingTitle,
            value: t.listingValue,
            category: t.listingCategory,
            image: t.listingImage,
          },
          otherUser: userMap[t.otherUserId] || null,
          itemCount: itemCountMap[t.id] || 0,
        })),
        total: tradeList.length,
      };
    }),

  getUnreadTradeAlertCount: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [result] = await db.execute(
        sql`SELECT COUNT(*) as count FROM tradeAlerts WHERE recipientUserId = ${userId} AND isRead = 0`
      );
      return { count: (result as any)?.[0]?.count || 0 };
    }),

  getTradeDetails: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      // Get the proposal
      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      // Get the requested listing (the item being inquired about)
      const [requestedListing] = await db.select().from(listings).where(eq(listings.id, proposal.requestedListingId)).limit(1);

      // Get photos for the requested listing
      const requestedPhotos = await db.select().from(listingPhotos).where(eq(listingPhotos.listingId, proposal.requestedListingId)).orderBy(asc(listingPhotos.sortOrder));

      // Get all proposal items (items offered by both sides)
      const proposalItems = await db.select().from(tradeProposalItems).where(eq(tradeProposalItems.proposalId, input.proposalId));

      // Get listing details for each proposal item
      const offeredListingIds = proposalItems.map(pi => pi.offeredListingId);
      let offeredListings: any[] = [];
      if (offeredListingIds.length > 0) {
        offeredListings = await db.select().from(listings).where(inArray(listings.id, offeredListingIds));
        // Get photos for offered listings
        for (const listing of offeredListings) {
          const photos = await db.select().from(listingPhotos).where(eq(listingPhotos.listingId, listing.id)).orderBy(asc(listingPhotos.sortOrder));
          (listing as any).photos = photos;
        }
      }

      // Get other user info
      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      const [otherUserResult] = await db.execute(
        sql`SELECT u.id, u.username, u.name, up.displayName, up.avatarUrl, up.bio,
          (SELECT AVG(rating) FROM tradeReviews WHERE revieweeId = u.id) as avgRating,
          (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = u.id) as reviewCount
        FROM users u
        LEFT JOIN userProfiles up ON up.userId = u.id
        WHERE u.id = ${otherUserId}`
      );

      // Get trade reference number and other new fields via raw SQL
      const [tradeExtra] = await db.execute(
        sql`SELECT tradeReferenceNumber, negotiatingAt, acceptedAt, shippedAt, lastActivityAt, cashFromRequester, cashFromRecipient, middleManRequested, middleManApproved, declineReason FROM tradeProposals WHERE id = ${input.proposalId}`
      );

      return {
        proposal: {
          ...proposal,
          ...(tradeExtra as any)?.[0],
        },
        requestedListing: {
          ...requestedListing,
          photos: requestedPhotos,
        },
        offeredListings: offeredListings.map(l => ({
          ...l,
          ownerId: l.ownerId,
        })),
        otherUser: (otherUserResult as any)?.[0] || null,
        isRequester: proposal.requesterId === userId,
      };
    }),

  getOtherUserInventory: protectedProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      category: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });

      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;

      let query = sql`SELECT l.id, l.title, l.category, l.estimatedValue, l.condition, l.grade, l.certificationCompany,
        (SELECT imageUrl FROM listingPhotos WHERE listingId = l.id ORDER BY sortOrder ASC LIMIT 1) as primaryImage
      FROM listings l
      WHERE l.ownerId = ${otherUserId} AND l.isActive = 1 AND l.status = 'active'`;

      if (input.category) {
        query = sql`${query} AND l.category = ${input.category}`;
      }
      if (input.search) {
        query = sql`${query} AND l.title LIKE ${`%${input.search}%`}`;
      }

      query = sql`${query} ORDER BY l.createdAt DESC LIMIT 50`;

      const [items] = await db.execute(query);
      return { items: (items as unknown as any[]) };
    }),

  getShippingInfo: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const [tracking] = await db.execute(
        sql`SELECT * FROM tradeTrackingNumbers WHERE proposalId = ${input.proposalId}`
      );
      const [receipts] = await db.execute(
        sql`SELECT * FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId}`
      );

      return {
        trackingNumbers: (tracking as unknown as any[]),
        receipts: (receipts as unknown as any[]),
      };
    }),

  // ==========================================================================
  // COMMUNICATION
  // ==========================================================================

  sendMessage: protectedProcedure
    .input(sendTradeMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.insert(tradeMessages).values({
        proposalId: input.proposalId,
        senderId: userId,
        message: input.message,
        createdAt: now,
      });

      // Update lastActivityAt (resets auto-cancel timer)
      await db.execute(
        sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );

      // Alert other party
      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      await db.execute(
        sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, isRead, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'initiated', 'New message in trade', 0, ${now})`
      );

      return { success: true };
    }),

  getMessages: protectedProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const [messages] = await db.execute(
        sql`SELECT tm.id, tm.senderId, tm.message, tm.messageType, tm.metadata, tm.createdAt,
          u.username as senderUsername, up.displayName as senderDisplayName, up.avatarUrl as senderAvatar
        FROM tradeMessages tm
        LEFT JOIN users u ON u.id = tm.senderId
        LEFT JOIN userProfiles up ON up.userId = tm.senderId
        WHERE tm.proposalId = ${input.proposalId}
        ORDER BY tm.createdAt ASC
        LIMIT ${input.limit} OFFSET ${input.offset}`
      );

      return { messages: (messages as unknown as any[]) };
    }),

  // ==========================================================================
  // PRO FEATURES
  // ==========================================================================

  middleManService: protectedProcedure
    .input(middleManRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (input.action === 'request') {
        await db.execute(
          sql`UPDATE tradeProposals SET middleManRequested = 1, middleManRequestedBy = ${userId}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      } else if (input.action === 'approve') {
        await db.execute(
          sql`UPDATE tradeProposals SET middleManApproved = 1, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      } else if (input.action === 'deselect') {
        await db.execute(
          sql`UPDATE tradeProposals SET middleManRequested = 0, middleManApproved = 0, middleManRequestedBy = NULL, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      }

      return { success: true };
    }),

  generateVotingLink: protectedProcedure
    .input(generateVotingLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Generate unique token
      const token = Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');

      // Expires in 3 days
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      await db.execute(
        sql`INSERT INTO tradeVotingLinks (proposalId, generatedByUserId, linkToken, expiresAt, createdAt) VALUES (${input.proposalId}, ${userId}, ${token}, ${expiresAt}, ${now})`
      );

      return { token, expiresAt };
    }),

  castVote: protectedProcedure
    .input(castVoteSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Validate link
      const [links] = await db.execute(
        sql`SELECT id, proposalId, expiresAt FROM tradeVotingLinks WHERE linkToken = ${input.linkToken}`
      );
      const link = (links as any)?.[0];
      if (!link) throw new TRPCError({ code: 'NOT_FOUND', message: 'Voting link not found' });
      if (new Date(link.expiresAt) < new Date()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Voting link has expired' });

      // Validate user is not a party to the trade
      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, link.proposalId)).limit(1);
      if (proposal && (proposal.requesterId === userId || proposal.recipientId === userId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot vote on your own trade' });
      }

      await db.execute(
        sql`INSERT INTO tradeVotes (votingLinkId, voterUserId, verdict, comment, createdAt) VALUES (${link.id}, ${userId}, ${input.verdict}, ${input.comment || null}, ${now})`
      );

      return { success: true };
    }),

  getVotingResults: protectedProcedure
    .input(z.object({ linkToken: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();

      const [links] = await db.execute(
        sql`SELECT id, proposalId FROM tradeVotingLinks WHERE linkToken = ${input.linkToken}`
      );
      const link = (links as any)?.[0];
      if (!link) throw new TRPCError({ code: 'NOT_FOUND', message: 'Voting link not found' });

      // Get anonymous trade details for the comparison
      const [proposals] = await db.execute(
        sql`SELECT tp.requestedListingId, tp.cashFromRequester, tp.cashFromRecipient,
          l.title as requestedTitle, l.estimatedValue as requestedValue, l.category as requestedCategory
        FROM tradeProposals tp
        LEFT JOIN listings l ON l.id = tp.requestedListingId
        WHERE tp.id = ${link.proposalId}`
      );
      const proposalData = (proposals as unknown as any[])?.[0];

      // Get offered items (Trader A's side)
      const [offeredItems] = await db.execute(
        sql`SELECT l.title, l.estimatedValue, l.category
        FROM tradeProposalItems tpi
        JOIN listings l ON l.id = tpi.offeredListingId
        WHERE tpi.proposalId = ${link.proposalId}`
      );

      const [votes] = await db.execute(
        sql`SELECT verdict, comment, createdAt FROM tradeVotes WHERE votingLinkId = ${link.id} ORDER BY createdAt DESC`
      );

      const voteList = (votes as unknown as any[]);
      const total = voteList.length;
      const steal = voteList.filter(v => v.verdict === 'steal').length;
      const fair = voteList.filter(v => v.verdict === 'fair').length;
      const pass = voteList.filter(v => v.verdict === 'pass').length;

      return {
        total,
        steal: { count: steal, percentage: total > 0 ? Math.round((steal / total) * 100) : 0 },
        fair: { count: fair, percentage: total > 0 ? Math.round((fair / total) * 100) : 0 },
        pass: { count: pass, percentage: total > 0 ? Math.round((pass / total) * 100) : 0 },
        comments: voteList.filter(v => v.comment).map(v => ({ verdict: v.verdict, comment: v.comment, createdAt: v.createdAt })),
        // Anonymous trade details (no usernames)
        tradeDetails: {
          traderA: {
            items: (offeredItems as unknown as any[]).map((i: any) => ({ title: i.title, value: i.estimatedValue, category: i.category })),
            cash: proposalData?.cashFromRequester || 0,
          },
          traderB: {
            items: proposalData ? [{ title: proposalData.requestedTitle, value: proposalData.requestedValue, category: proposalData.requestedCategory }] : [],
            cash: proposalData?.cashFromRecipient || 0,
          },
        },
      };
    }),

  savePrivateNote: protectedProcedure
    .input(savePrivateNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Upsert
      await db.execute(
        sql`INSERT INTO tradePrivateNotes (proposalId, userId, noteContent, createdAt, updatedAt) VALUES (${input.proposalId}, ${userId}, ${input.noteContent}, ${now}, ${now}) ON DUPLICATE KEY UPDATE noteContent = ${input.noteContent}, updatedAt = ${now}`
      );

      return { success: true };
    }),

  getPrivateNote: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [notes] = await db.execute(
        sql`SELECT noteContent, updatedAt FROM tradePrivateNotes WHERE proposalId = ${input.proposalId} AND userId = ${userId}`
      );
      const note = (notes as any)?.[0];
      return { noteContent: note?.noteContent || '', updatedAt: note?.updatedAt || null };
    }),

  markAlertsAsRead: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      await db.execute(
        sql`UPDATE tradeAlerts SET isRead = 1 WHERE proposalId = ${input.proposalId} AND recipientUserId = ${userId}`
      );

      return { success: true };
    }),
});
