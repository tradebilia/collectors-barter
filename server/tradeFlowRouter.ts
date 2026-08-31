/**
 * Trade Flow Router — Full Implementation
 * 
 * Reference: FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md
 * Reference: COMPLETE_TRADE_FLOW_SPECIFICATION.md
 */

import { z } from "zod";
import { randomBytes } from "node:crypto";
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
	tradeActivityLog,
	tradeAdminLog,
	tradePayments,
} from "../drizzle/schema";

import { eq, sql, desc, or, and, inArray, asc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import {
  sendTradeInitiatedEmail,
  sendCounterProposalEmail,
  sendProposalAcceptedEmail,
  sendProposalRejectedEmail,
  sendItemsShippedEmail,
  sendItemsReceivedEmail,
  sendFeedbackReceivedEmail,
  sendTradeCancelledEmail,
} from "./_core/email";
import { buildLegacyTradeTimeline, isMissingTradeActivityLogError } from "./tradeTimeline";
import { getReviewSubmissionBlocker, resolveTradeContactName } from "./tradeRoomSafeguards";
import { buildCompletedTradeExchange } from "../shared/completedTradeExchange";
import { requireMarketplaceApproval } from "./accountApproval";
import { describeTradeCashChange } from "./tradeCashTimeline";
import { getPaymentVerificationObligations } from "./paymentAuthorization";

// ============================================================================
// HELPER: Check notification preference and get user email
// Returns { email, name } if the user has the given pref enabled, null otherwise
// ============================================================================
async function getEmailIfPrefEnabled(
  db: any,
  userId: number,
  prefKey: string
): Promise<{ email: string; name: string } | null> {
  const [rows] = await db.execute(
    sql`SELECT u.email, u.name, up.notificationPreferences
        FROM users u LEFT JOIN userProfiles up ON up.userId = u.id
        WHERE u.id = ${userId} LIMIT 1`
  );
  const row = (rows as any)?.[0];
  if (!row?.email) return null;
  let enabled = true; // default on
  try {
    const prefs = JSON.parse(row.notificationPreferences ?? '{}');
    if (prefs?.[prefKey]?.email === false) enabled = false;
  } catch {}
  if (!enabled) return null;
  return { email: row.email, name: row.name ?? `Collector ${userId}` };
}

// ============================================================================
// HELPER: Get user's display name (from userProfiles, falls back to username)
// ============================================================================
async function getUserDisplayName(db: any, userId: number): Promise<string> {
  const [rows] = await db.execute(
    sql`SELECT u.username, COALESCE(up.displayName, u.username) as displayName
        FROM users u LEFT JOIN userProfiles up ON up.userId = u.id
        WHERE u.id = ${userId} LIMIT 1`
  );
  const row = (rows as any)?.[0];
  return row?.displayName || row?.username || 'Unknown';
}

// ============================================================================
// HELPER: Create a trade alert — enforces one unread alert per trade per recipient
// ============================================================================
async function createTradeAlert(db: any, proposalId: number, recipientUserId: number, alertType: string, message: string, now: string): Promise<void> {
  // Only insert if no unread alert already exists for this trade for this recipient
  const [existing] = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM tradeAlerts
        WHERE proposalId = ${proposalId}
          AND recipientUserId = ${recipientUserId}
          AND isRead = 0`
  );
  const count = Number((existing as any)?.[0]?.cnt || 0);
  if (count === 0) {
    await db.execute(
      sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, isRead, createdAt)
          VALUES (${proposalId}, ${recipientUserId}, ${alertType}, ${message}, 0, ${now})`
    );
  }
}

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
  offeredListingIds: z.array(z.number().int().positive()).max(50),
  requestedListingIds: z.array(z.number().int().positive()).max(50).optional().default([]),
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
	      await requireMarketplaceApproval(userId);

	      // 1. Check if initiator is suspended or banned
      const [initiator] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if ((initiator as any)?.isBanned) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account has been permanently banned' });
      }
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

      // 4. Check if recipient (listing owner) is suspended or banned
      const [recipient] = await db.select().from(users).where(eq(users.id, listing.ownerId)).limit(1);
      if ((recipient as any)?.isBanned) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This user\'s account is no longer available' });
      }
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

      // 8. Create trade alert for recipient (one per trade while unread)
      await createTradeAlert(db, proposalId, listing.ownerId, 'initiated', `${ctx.user.name || initiator?.username || 'A user'} sent you a trade proposal for: ${listing.title} (TR-${tradeRef})`, now);

      // 7. Log to admin log
      await db.execute(
        sql`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${proposalId}, 'initiated', ${userId}, ${'Trade initiated'}, ${now})`
      );

      // 8. Log to activity log
      const initiatorName = (initiator as any)?.displayName || (initiator as any)?.username || 'Unknown';
      await db.execute(
        sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${proposalId}, ${userId}, ${initiatorName}, 'trade_created', ${`Trade created for item: ${listing.title}`}, ${now})`
      );

      // Email notification to listing owner (tradeInitiated preference)
      const recipientEmailData = await getEmailIfPrefEnabled(db, listing.ownerId, 'tradeInitiated');
      if (recipientEmailData) {
        sendTradeInitiatedEmail({
          recipientEmail: recipientEmailData.email,
          recipientName: recipientEmailData.name,
          senderName: ctx.user.name ?? 'A Tradebilia member',
          itemTitle: listing.title,
          tradeRef,
        }).catch(err => console.warn('[Email] Trade initiated email failed:', err));
      }

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
      await createTradeAlert(db, input.proposalId, otherUserId, 'declined', `Your trade (TR-${proposal.tradeReferenceNumber}) has been declined.`, now);

      // Log to activity log
      const [decliner] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const declinerName = (decliner as any)?.displayName || (decliner as any)?.username || 'Unknown';
      await db.execute(
        sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${declinerName}, 'proposal_declined', 'Trade declined', ${now})`
      );

      // Email notification to requester (proposalRejected preference)
      const otherEmailData = await getEmailIfPrefEnabled(db, otherUserId, 'proposalRejected');
      if (otherEmailData) {
        sendProposalRejectedEmail({
          recipientEmail: otherEmailData.email,
          recipientName: otherEmailData.name,
          otherPartyName: declinerName,
          tradeRef: proposal.tradeReferenceNumber ?? String(input.proposalId),
          reason: input.reason,
        }).catch(err => console.warn('[Email] Proposal rejected email failed:', err));
      }

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
      await createTradeAlert(db, input.proposalId, otherUserId, 'cancelled', `Your trade (TR-${proposal.tradeReferenceNumber}) has been cancelled.`, now);

      // Log to activity log
      const [canceller] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const cancellerName = (canceller as any)?.displayName || (canceller as any)?.username || 'Unknown';
      await db.execute(
        sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${cancellerName}, 'trade_cancelled', 'Trade cancelled', ${now})`
      );

      // Email notification (proposalRejected preference covers cancellations too)
      const cancelledEmailData = await getEmailIfPrefEnabled(db, otherUserId, 'proposalRejected');
      if (cancelledEmailData) {
        sendTradeCancelledEmail({
          recipientEmail: cancelledEmailData.email,
          recipientName: cancelledEmailData.name,
          cancelledByName: cancellerName,
          tradeRef: proposal.tradeReferenceNumber ?? String(input.proposalId),
        }).catch(err => console.warn('[Email] Trade cancelled email failed:', err));
      }

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
        // Log to activity log
        const [joiner] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const joinerName = (joiner as any)?.displayName || (joiner as any)?.username || 'Unknown';
        await db.execute(
          sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${joinerName}, 'partner_joined', 'Entered the Trade Room', ${now})`
        );
      }

      return { success: true };
    }),

	  sendTradeProposal: protectedProcedure
	    .input(sendProposalSchema)
	    .mutation(async ({ ctx, input }) => {
	      const db = await requireDb();
	      const userId = ctx.user.id;
	      await requireMarketplaceApproval(userId);
	      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const counteroffer = await db.transaction(async (tx) => {
        const [proposalRows] = await tx.execute(
          sql`SELECT * FROM tradeProposals WHERE id = ${input.proposalId} FOR UPDATE`
        );
        const proposal = (proposalRows as unknown as any[])?.[0];
        if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
        if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
        }
        if (!['pending', 'negotiating'].includes(proposal.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trade can only be updated while pending or negotiating' });
        }
        if (proposal.status === 'pending' && proposal.requesterId === userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your inquiry is awaiting the listing owner’s response. You can decline it, but you cannot submit a trade proposal yet.' });
        }
        if (proposal.status === 'negotiating' && proposal.lastProposedBy === userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your proposal is awaiting the other member’s response. You can decline it, but you cannot submit another proposal yet.' });
        }

        const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
        const offeredListingIds = [...new Set(input.offeredListingIds)];
        const requestedListingIds = [...new Set(input.requestedListingIds ?? [])];
        if (offeredListingIds.length !== input.offeredListingIds.length) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Each offered item may be included only once' });
        }
        if (requestedListingIds.length !== (input.requestedListingIds ?? []).length) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Each requested item may be included only once' });
        }
        if (offeredListingIds.some((listingId) => requestedListingIds.includes(listingId))) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A trade item cannot be offered and requested at the same time' });
        }
        if (offeredListingIds.includes(proposal.requestedListingId) || requestedListingIds.includes(proposal.requestedListingId)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'The original requested item is already included in this trade' });
        }

        let itemRows: Array<{ id: number; title: string }> = [];
        if (offeredListingIds.length > 0) {
          const [ownedRows] = await tx.execute(
            sql`SELECT id, title FROM listings WHERE id IN (${sql.join(offeredListingIds.map(id => sql`${id}`), sql`, `)}) AND ownerId = ${userId} AND isActive = 1 AND status = 'active' FOR UPDATE`
          );
          itemRows = (ownedRows as unknown as Array<{ id: number; title: string }>) || [];
          if (itemRows.length !== offeredListingIds.length) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Every offered item must be an active listing you own' });
          }
        }

        let requestedItemRows: Array<{ id: number; title: string }> = [];
        if (requestedListingIds.length > 0) {
          const [requestedRows] = await tx.execute(
            sql`SELECT id, title FROM listings WHERE id IN (${sql.join(requestedListingIds.map(id => sql`${id}`), sql`, `)}) AND ownerId = ${otherUserId} AND isActive = 1 AND status = 'active' FOR UPDATE`
          );
          requestedItemRows = (requestedRows as unknown as Array<{ id: number; title: string }>) || [];
          if (requestedItemRows.length !== requestedListingIds.length) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Every requested item must be an active listing owned by the other member' });
          }
        }

        const [currentOfferRows] = await tx.execute(
          sql`SELECT tpi.offeredListingId AS id
              FROM tradeProposalItems tpi
              WHERE tpi.proposalId = ${input.proposalId}
              FOR UPDATE`
        );
        const currentOfferIds = ((currentOfferRows as unknown as Array<{ id: number }>) || [])
          .map((row) => row.id)
          .sort((left, right) => left - right);
        const nextOfferIds = [...new Set([...offeredListingIds, ...requestedListingIds])].sort((left, right) => left - right);
        const offeredItemsChanged = currentOfferIds.length !== nextOfferIds.length
          || currentOfferIds.some((listingId, index) => listingId !== nextOfferIds[index]);

        const senderIsRequester = proposal.requesterId === userId;
        const newCashFromRequester = senderIsRequester ? (input.cashFromProposer ?? 0) : (input.cashFromRecipient ?? 0);
        const newCashFromRecipient = senderIsRequester ? (input.cashFromRecipient ?? 0) : (input.cashFromProposer ?? 0);
        const cashTermsWereSubmitted = input.cashFromProposer !== undefined || input.cashFromRecipient !== undefined;
        const cashTermsChanged = cashTermsWereSubmitted && (
          Number(proposal.cashFromRequester ?? 0) !== newCashFromRequester
          || Number(proposal.cashFromRecipient ?? 0) !== newCashFromRecipient
        );
        const termsChanged = offeredItemsChanged || cashTermsChanged;

        await tx.execute(sql`DELETE FROM tradeProposalItems WHERE proposalId = ${input.proposalId}`);
        for (const listingId of nextOfferIds) {
          await tx.insert(tradeProposalItems).values({ proposalId: input.proposalId, offeredListingId: listingId, createdAt: now });
        }

        if (cashTermsWereSubmitted) {
          await tx.execute(sql`UPDATE tradeProposals SET status = 'negotiating', cashFromRequester = ${newCashFromRequester}, cashFromRecipient = ${newCashFromRecipient}, lastProposedBy = ${userId}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`);
        } else {
          await tx.execute(sql`UPDATE tradeProposals SET status = 'negotiating', lastProposedBy = ${userId}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`);
        }

        if (input.message) {
          await tx.insert(tradeMessages).values({ proposalId: input.proposalId, senderId: userId, message: input.message, createdAt: now });
        }

        await createTradeAlert(tx, input.proposalId, otherUserId, 'counterProposal', `A new counter proposal has been submitted for your trade (TR-${proposal.tradeReferenceNumber}).`, now);
        const actorName = await getUserDisplayName(tx, userId);
        const otherMemberName = await getUserDisplayName(tx, otherUserId);
        if (termsChanged) {
          await tx.execute(
            sql`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType = 'accepted'`
          );
          await tx.execute(
            sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${actorName}, 'proposal_sent', 'Trade terms changed; both members must accept the updated terms.', ${now})`
          );
        }
        for (const item of [...itemRows, ...requestedItemRows]) {
          await tx.execute(sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${actorName}, 'item_added', ${`Added: ${item.title}`}, ${now})`);
        }
        if (cashTermsChanged) {
          const requesterName = senderIsRequester ? actorName : otherMemberName;
          const recipientName = senderIsRequester ? otherMemberName : actorName;
          const cashTimelineChanges = [
            describeTradeCashChange(requesterName, Number(proposal.cashFromRequester ?? 0), newCashFromRequester),
            describeTradeCashChange(recipientName, Number(proposal.cashFromRecipient ?? 0), newCashFromRecipient),
          ].filter((change): change is NonNullable<typeof change> => change !== null);

          for (const change of cashTimelineChanges) {
            await tx.execute(sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${actorName}, ${change.eventType}, ${change.details}, ${now})`);
          }
        }
        if (!termsChanged) {
          await tx.execute(sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${actorName}, 'proposal_sent', 'Counter offer submitted', ${now})`);
        }

        return { otherUserId, actorName, tradeReferenceNumber: proposal.tradeReferenceNumber };
      });

      const counterEmailData = await getEmailIfPrefEnabled(db, counteroffer.otherUserId, 'counterProposal');
      if (counterEmailData) {
        sendCounterProposalEmail({
          recipientEmail: counterEmailData.email,
          recipientName: counterEmailData.name,
          senderName: counteroffer.actorName,
          tradeRef: counteroffer.tradeReferenceNumber ?? String(input.proposalId),
        }).catch(err => console.warn('[Email] Counter proposal email failed:', err));
      }

      return { success: true };
    }),
  acceptTradeProposal: protectedProcedure
    .input(acceptProposalSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const acceptance = await db.transaction(async (tx) => {
        const db = tx as any;
        const [proposalRows] = await db.execute(
          sql`SELECT * FROM tradeProposals WHERE id = ${input.proposalId} FOR UPDATE`
        );
        const proposal = (proposalRows as any[])?.[0];
        if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
        if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
        }
        const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
        if (proposal.status === 'accepted' || proposal.status === 'shipping') {
          return { success: true, mutualAcceptance: true, alreadyAccepted: true, otherUserId, tradeReferenceNumber: proposal.tradeReferenceNumber, actorName: null, notification: 'none' as const };
        }
        if (!['negotiating'].includes(proposal.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trade must be in negotiating status to accept' });
        }

        const [existingAcceptance] = await db.execute(
          sql`SELECT userId FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType = 'accepted' FOR UPDATE`
        );
        const acceptedUserIds = new Set(((existingAcceptance as any[]) || []).map(row => row.userId));
        const otherHasAccepted = acceptedUserIds.has(otherUserId);
        if (acceptedUserIds.has(userId)) {
          return { success: true, mutualAcceptance: false, alreadyAccepted: true, otherUserId, tradeReferenceNumber: proposal.tradeReferenceNumber, actorName: null, notification: 'none' as const };
        }

      if (otherHasAccepted) {
        // Both have now accepted — keep the trade in Review while locking its
        // agreed items. Shipping and its deadline begin only once both people
        // confirm this final review through proceedToShipping.
        const [offeredListingRows] = await db.execute(
          sql`SELECT offeredListingId FROM tradeProposalItems WHERE proposalId = ${input.proposalId}`
        );
        const involvedListingIds = [...new Set([
          proposal.requestedListingId,
          ...((offeredListingRows as any[]) || []).map((row) => row.offeredListingId),
        ])].sort((left, right) => Number(left) - Number(right));

        if (involvedListingIds.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trade must include an active listing' });
        }

        // Stable all-listing locks serialize competing acceptances that share
        // any item; the losing proposal rechecks and returns a neutral conflict.
        const [lockedListingRows] = await db.execute(
          sql`SELECT id FROM listings WHERE id IN (${sql.join(involvedListingIds.map((id) => sql`${id}`), sql`, `)}) AND isActive = 1 AND status = 'active' ORDER BY id FOR UPDATE`
        );
        if (((lockedListingRows as any[]) || []).length !== involvedListingIds.length) {
          throw new TRPCError({ code: 'CONFLICT', message: 'One or more trade items are no longer available' });
        }

        const [listingLockResult] = await db.execute(
          sql`UPDATE listings SET status = 'traded' WHERE id IN (${sql.join(involvedListingIds.map((id) => sql`${id}`), sql`, `)}) AND isActive = 1 AND status = 'active'`
        );
        if (Number((listingLockResult as any)?.affectedRows ?? 0) !== involvedListingIds.length) {
          throw new TRPCError({ code: 'CONFLICT', message: 'One or more trade items are no longer available' });
        }

        await db.execute(
          sql`UPDATE tradeProposals SET status = 'accepted', acceptedAt = ${now}, shippingAt = NULL, shippingDeadline = NULL, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
          await createTradeAlert(db, input.proposalId, otherUserId, 'accepted', `Both parties have accepted trade (TR-${proposal.tradeReferenceNumber})! Please review the final terms and confirm when ready to ship.`, now);
        await db.execute(
          sql`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${input.proposalId}, 'accepted', ${userId}, 'Mutual acceptance — trade locked, entering Review stage', ${now})`
        );
        // Clean up the acceptance records
        await db.execute(
          sql`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType = 'accepted'`
        );

        // Auto-cancel all other pending/negotiating proposals involving these items
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Item is no longer available (traded in another proposal)', updatedAt = ${now} WHERE id != ${input.proposalId} AND requestedListingId = ${proposal.requestedListingId} AND status IN ('pending', 'negotiating')`
        );
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'An item in this proposal is no longer available', updatedAt = ${now} WHERE id != ${input.proposalId} AND status IN ('pending', 'negotiating') AND id IN (SELECT proposalId FROM tradeProposalItems WHERE offeredListingId IN (SELECT offeredListingId FROM tradeProposalItems WHERE proposalId = ${input.proposalId}))`
        );

        // Log mutual acceptance to activity log
        const [acceptor2] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const acceptorName2 = (acceptor2 as any)?.displayName || (acceptor2 as any)?.username || 'Unknown';
        await db.execute(
          sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${acceptorName2}, 'proposal_accepted', 'Both parties accepted — trade locked! Entering Review stage.', ${now})`
        );
        return { success: true, mutualAcceptance: true, alreadyAccepted: false, otherUserId, tradeReferenceNumber: proposal.tradeReferenceNumber, actorName: acceptorName2, notification: 'mutual' as const };
      } else {
        // First acceptance — record it and notify other party (72-hour window)
        await db.execute(
          sql`INSERT INTO tradeReceiptConfirmation (proposalId, userId, confirmationType, confirmedAt) VALUES (${input.proposalId}, ${userId}, 'accepted', ${now})`
        );
        await db.execute(
          sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
          await createTradeAlert(db, input.proposalId, otherUserId, 'accepted', `Your trade partner has accepted trade (TR-${proposal.tradeReferenceNumber})! You have 72 hours to confirm.`, now);
        await db.execute(
          sql`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${input.proposalId}, 'accepted', ${userId}, 'First acceptance — awaiting mutual confirmation', ${now})`
        );
        // Log first acceptance to activity log
        const [acceptor1] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const acceptorName1 = (acceptor1 as any)?.displayName || (acceptor1 as any)?.username || 'Unknown';
        await db.execute(
          sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${acceptorName1}, 'proposal_accepted', 'Accepted the proposal — awaiting partner confirmation', ${now})`
        );
        return { success: true, mutualAcceptance: false, alreadyAccepted: false, otherUserId, tradeReferenceNumber: proposal.tradeReferenceNumber, actorName: acceptorName1, notification: 'first' as const };
      }
      });

      if (!acceptance.alreadyAccepted && acceptance.notification === 'mutual') {
        const [acceptorEmailData, otherAcceptorEmailData] = await Promise.all([
          getEmailIfPrefEnabled(db, userId, 'proposalAccepted'),
          getEmailIfPrefEnabled(db, acceptance.otherUserId, 'proposalAccepted'),
        ]);
        for (const recipient of [acceptorEmailData, otherAcceptorEmailData]) {
          if (recipient) {
            sendProposalAcceptedEmail({
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              otherPartyName: 'Your trade partner',
              itemTitle: '',
              tradeRef: acceptance.tradeReferenceNumber ?? String(input.proposalId),
            }).catch(err => console.warn('[Email] Proposal accepted email failed:', err));
          }
        }
      }
      if (!acceptance.alreadyAccepted && acceptance.notification === 'first') {
        const recipient = await getEmailIfPrefEnabled(db, acceptance.otherUserId, 'proposalAccepted');
        if (recipient) {
          sendProposalAcceptedEmail({
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            otherPartyName: acceptance.actorName ?? 'Your trade partner',
            itemTitle: '',
            tradeRef: acceptance.tradeReferenceNumber ?? String(input.proposalId),
          }).catch(err => console.warn('[Email] First acceptance email failed:', err));
        }
      }
      return { success: true, mutualAcceptance: acceptance.mutualAcceptance, alreadyAccepted: acceptance.alreadyAccepted };
    }),
  markTradeDisputed: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const actorName = await getUserDisplayName(db, userId);

      return db.transaction(async (tx) => {
        const [proposalRows] = await tx.execute(
          sql`SELECT * FROM tradeProposals WHERE id = ${input.proposalId} FOR UPDATE`
        );
        const proposal = (proposalRows as unknown as any[])?.[0];
        if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
        if (proposal.requesterId !== userId && proposal.recipientId !== userId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only trade participants can request dispute review' });
        }
        if (proposal.status === 'disputed') {
          return { success: true, alreadyDisputed: true, tradeReferenceNumber: proposal.tradeReferenceNumber };
        }
        if (!['accepted', 'shipping', 'shipped', 'completed'].includes(proposal.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Dispute review is available after the trade has been accepted' });
        }

        await tx.execute(
          sql`UPDATE tradeProposals SET status = 'disputed', lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
        await tx.insert(tradeAdminLog).values({
          proposalId: input.proposalId,
          actorUserId: userId,
          eventType: 'disputed',
          details: 'Trade marked disputed — administrator review requested.',
          createdAt: now,
        });
        await tx.insert(tradeMessages).values({
          proposalId: input.proposalId,
          senderId: userId,
          message: `${actorName} requested administrator dispute review for this trade.`,
          messageType: 'system',
          metadata: JSON.stringify({ type: 'trade_disputed', requestedBy: userId }),
          createdAt: now,
        });

        return { success: true, alreadyDisputed: false, tradeReferenceNumber: proposal.tradeReferenceNumber };
      });
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

      // Email notification (proposalRejected preference)
      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      const rejecterName = await getUserDisplayName(db, userId);
      const rejectEmailData = await getEmailIfPrefEnabled(db, otherUserId, 'proposalRejected');
      if (rejectEmailData) {
        sendProposalRejectedEmail({
          recipientEmail: rejectEmailData.email,
          recipientName: rejectEmailData.name,
          otherPartyName: rejecterName,
          tradeRef: proposal.tradeReferenceNumber ?? String(input.proposalId),
          reason: input.reason,
        }).catch(err => console.warn('[Email] Reject proposal email failed:', err));
      }

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
      if (!['shipping', 'shipped', 'accepted'].includes(proposal.status as string)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trade must be in shipping stage to submit tracking' });
      }
      if ((proposal.status as string) === 'accepted') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Both members must complete Review before tracking can be submitted.' });
      }

      const expectedListingIds = proposal.requesterId === userId
        ? [proposal.requestedListingId]
        : (await db.select({ listingId: tradeProposalItems.offeredListingId })
          .from(tradeProposalItems)
          .where(eq(tradeProposalItems.proposalId, input.proposalId)))
          .map((item) => item.listingId);
      const submittedListingIds = input.trackingNumbers.map((tracking) => tracking.listingId);
      if (new Set(submittedListingIds).size !== submittedListingIds.length || submittedListingIds.some((listingId) => !expectedListingIds.includes(listingId))) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tracking can only be submitted once for each item you are sending in this trade.' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Delete existing tracking for this user and re-insert (allows updating)
      await db.execute(
        sql`DELETE FROM tradeTrackingNumbers WHERE proposalId = ${input.proposalId} AND userId = ${userId}`
      );

      for (const tracking of input.trackingNumbers) {
        await db.execute(
          sql`INSERT INTO tradeTrackingNumbers (proposalId, userId, listingId, carrier, carrierOther, trackingNumber, submittedAt) VALUES (${input.proposalId}, ${userId}, ${tracking.listingId}, ${tracking.carrier}, ${tracking.carrierOther || null}, ${tracking.trackingNumber}, ${now})`
        );
      }

			// Item receipt confirmation starts only after both members have shipped
			// and every direct cash obligation has been confirmed in Shipping.
			const [trackingCounts] = await db.execute(
				sql`SELECT COUNT(DISTINCT userId) as userCount FROM tradeTrackingNumbers WHERE proposalId = ${input.proposalId}`
			);
			const bothShipped = (trackingCounts as any)?.[0]?.userCount >= 2;
			const cashObligations = getPaymentVerificationObligations(proposal);
			const paymentRows = cashObligations.length
				? await db.select({ payerId: tradePayments.payerId, status: tradePayments.status }).from(tradePayments)
					.where(and(eq(tradePayments.proposalId, input.proposalId), inArray(tradePayments.payerId, cashObligations.map((obligation) => obligation.payerId))))
				: [];
			const paymentStatusByPayerId = new Map(paymentRows.map((payment) => [payment.payerId, payment.status]));
			const cashSettlementComplete = cashObligations.every((obligation) => ['received', 'verified'].includes(paymentStatusByPayerId.get(obligation.payerId) ?? 'pending'));

			if (bothShipped && cashSettlementComplete) {
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'shipped', shippedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      } else {
        await db.execute(
          sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      }

      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      const [actor] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const actorName = await getUserDisplayName(db, userId);
      const trackingAlertMsg = `${actorName} has submitted their tracking number`;
      await createTradeAlert(db, input.proposalId, otherUserId, 'shipped', `${actorName} has submitted tracking information for trade (TR-${proposal.tradeReferenceNumber}).`, now);
            await db.execute(
        sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${actorName}, 'tracking_submitted', 'Tracking number submitted', ${now})`
      );

      // Email notification (itemsShipped preference)
      const shippedEmailData = await getEmailIfPrefEnabled(db, otherUserId, 'itemsShipped');
      if (shippedEmailData) {
        const firstTracking = input.trackingNumbers[0];
        sendItemsShippedEmail({
          recipientEmail: shippedEmailData.email,
          recipientName: shippedEmailData.name,
          senderName: actorName,
          tradeRef: proposal.tradeReferenceNumber ?? String(input.proposalId),
          trackingNumber: firstTracking?.trackingNumber,
        }).catch(err => console.warn('[Email] Items shipped email failed:', err));
      }

			return { success: true, bothShipped, awaitingCashSettlement: bothShipped && !cashSettlementComplete };
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
      if ((proposal.status as string) !== 'shipped') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Receipt confirmation is available after both members have submitted tracking.' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await db.execute(
        sql`INSERT INTO tradeReceiptConfirmation (proposalId, userId, confirmationType, confirmedAt) VALUES (${input.proposalId}, ${userId}, ${input.confirmationType}, ${now}) ON DUPLICATE KEY UPDATE id = id`
      );

      // Check if both confirmed receipt (exclude 'accepted' type which is used for mutual acceptance)
      const [confirmCounts] = await db.execute(
        sql`SELECT COUNT(DISTINCT userId) as userCount FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType IN ('received', 'damaged')`
      );
      const bothConfirmed = (confirmCounts as any)?.[0]?.userCount >= 2;

      if (bothConfirmed) {
        // Generate a unique reference number: TR-XXXXX (zero-padded proposal ID)
        const refNumber = `TR-${String(input.proposalId).padStart(5, '0')}`;
        await db.execute(
          sql`UPDATE tradeProposals SET status = 'completed', completedAt = ${now}, referenceNumber = ${refNumber}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
      }

            const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      await createTradeAlert(db, input.proposalId, otherUserId, 'received', `Your trade partner has confirmed receipt for trade (TR-${proposal.tradeReferenceNumber}).`, now);

      // Email notification (itemsReceived preference)
      const receivedActorName = await getUserDisplayName(db, userId);
      const receivedEmailData = await getEmailIfPrefEnabled(db, otherUserId, 'itemsReceived');
      if (receivedEmailData) {
        sendItemsReceivedEmail({
          recipientEmail: receivedEmailData.email,
          recipientName: receivedEmailData.name,
          otherPartyName: receivedActorName,
          tradeRef: proposal.tradeReferenceNumber ?? String(input.proposalId),
        }).catch(err => console.warn('[Email] Items received email failed:', err));
      }

      return { success: true };
    }),
  fileComplaint: protectedProcedure
    .input(fileComplaintSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db
        .select({ requesterId: tradeProposals.requesterId, recipientId: tradeProposals.recipientId })
        .from(tradeProposals)
        .where(eq(tradeProposals.id, input.proposalId))
        .limit(1);

      if (!proposal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      }
      if (proposal.requesterId !== userId && proposal.recipientId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only trade participants can file a complaint.' });
      }

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

      const isParticipant = proposal.requesterId === userId || proposal.recipientId === userId;
      const [existingReviewRows] = await db.execute(
        sql`SELECT id FROM tradeReviews WHERE proposalId = ${input.proposalId} AND reviewerId = ${userId} LIMIT 1`
      );
      const reviewBlocker = getReviewSubmissionBlocker({
        isParticipant,
        tradeStatus: proposal.status as string,
        alreadyReviewed: Boolean((existingReviewRows as unknown as any[])?.[0]),
      });
      if (reviewBlocker === 'not-participant') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only trade participants can leave a review.' });
      if (reviewBlocker === 'trade-not-completed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reviews are available after the trade is completed.' });
      if (reviewBlocker === 'already-reviewed') throw new TRPCError({ code: 'CONFLICT', message: 'You have already submitted a review for this trade.' });

      const revieweeId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      const overallRating = ((input.tradeExperienceRating + input.itemConditionRating + input.communicationRating + input.shippingSpeedRating) / 4).toFixed(1);

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      try {
        await db.insert(tradeReviews).values({
          proposalId: input.proposalId,
          reviewerId: userId,
          revieweeId: revieweeId,
          rating: Math.round(parseFloat(overallRating)),
          review: input.review || null,
          createdAt: now,
        });
      } catch (error: any) {
        if (error?.code === 'ER_DUP_ENTRY' || error?.cause?.code === 'ER_DUP_ENTRY') {
          throw new TRPCError({ code: 'CONFLICT', message: 'You have already submitted a review for this trade.' });
        }
        throw error;
      }

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

      // Email notification to reviewee (feedbackReceived preference)
      const reviewerName = await getUserDisplayName(db, userId);
      const feedbackEmailData = await getEmailIfPrefEnabled(db, revieweeId, 'feedbackReceived');
      if (feedbackEmailData) {
        sendFeedbackReceivedEmail({
          recipientEmail: feedbackEmailData.email,
          recipientName: feedbackEmailData.name,
          reviewerName,
          rating: parseFloat(overallRating),
          tradeRef: proposal.tradeReferenceNumber ?? String(input.proposalId),
        }).catch(err => console.warn('[Email] Feedback received email failed:', err));
      }

      return { success: true };
    }),
  // ==========================================================================
  // QUERIES: TRADE HUB & WAR ROOM DATA
  // ==========================================================================

  getTradeAlerts: protectedProcedure
    .input(z.object({
      folder: z.enum(['proposal', 'negotiating', 'accepted', 'shipped', 'declined', 'completed']),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      // Map Trade Hub folders to proposal statuses
      const folderStatusMap: Record<string, string[]> = {
        proposal: ['pending'],
        negotiating: ['negotiating'],
        accepted: ['accepted', 'shipping'],
        shipped: ['shipped'],
        declined: ['declined', 'cancelled'],
        completed: ['completed'],
      };
      const statuses = folderStatusMap[input.folder] || ['pending'];
      const statusList = statuses.map(s => `'${s}'`).join(',');

      const [rows] = await db.execute(
        sql`SELECT
          tp.id,
          tp.status,
          tp.tradeReferenceNumber,
          tp.note,
          tp.createdAt,
          tp.lastActivityAt,
          tp.requesterId,
          tp.recipientId,
          tp.requestedListingId,
          -- Other user info
          CASE WHEN tp.requesterId = ${userId} THEN tp.recipientId ELSE tp.requesterId END as otherUserId,
          ou.username as otherUsername,
          oup.displayName as otherDisplayName,
          -- Requested listing info
          l.title as listingTitle,
          l.estimatedValue as listingValue,
          l.category as listingCategory,
          (SELECT imageUrl FROM listingPhotos WHERE listingId = l.id ORDER BY sortOrder ASC LIMIT 1) as listingImage,
          -- Unread alert count for this trade
          (SELECT COUNT(*) FROM tradeAlerts WHERE proposalId = tp.id AND recipientUserId = ${userId} AND isRead = 0) as unreadCount,
          -- Item count offered by both sides
          (SELECT COUNT(*) FROM tradeProposalItems WHERE proposalId = tp.id) as itemCount,
          -- Direction: incoming = other user initiated, outgoing = current user initiated
          CASE WHEN tp.requesterId = ${userId} THEN 'outgoing' ELSE 'incoming' END as direction,
          -- Ratings
          (SELECT AVG(COALESCE(overallRating, (tradeExperienceRating + itemConditionRating + communicationRating + shippingSpeedRating) / 4.0)) FROM tradeReviews WHERE revieweeId = CASE WHEN tp.requesterId = ${userId} THEN tp.recipientId ELSE tp.requesterId END) as otherAvgRating,
          (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = CASE WHEN tp.requesterId = ${userId} THEN tp.recipientId ELSE tp.requesterId END) as otherReviewCount,
          -- Verification (eBay: connected = verified, IDVerified flag is rarely set by eBay)
          (ou.ebayUsername IS NOT NULL AND ou.ebayUsername != '') as otherEbayVerified,
          ou.facebookVerified as otherFacebookVerified,
          (ou.linkedinId IS NOT NULL AND ou.linkedinId != '') as otherLinkedinVerified,
          ou.paypalVerified as otherPaypalVerified,
          (COALESCE(JSON_UNQUOTE(JSON_EXTRACT(oup.connectedAccounts, '$.etsy.etsyUserId')), '') != '') as otherEtsyVerified,
          -- Decline reason
          tp.declineReason
        FROM tradeProposals tp
        LEFT JOIN users ou ON ou.id = CASE WHEN tp.requesterId = ${userId} THEN tp.recipientId ELSE tp.requesterId END
        LEFT JOIN userProfiles oup ON oup.userId = ou.id
        LEFT JOIN listings l ON l.id = tp.requestedListingId
        WHERE (tp.requesterId = ${userId} OR tp.recipientId = ${userId})
          AND tp.status IN (${sql.raw(statusList)})
        ORDER BY COALESCE(tp.lastActivityAt, tp.createdAt) DESC
        LIMIT ${input.limit} OFFSET ${input.offset}`
      );

      const baseTrades = ((rows as unknown as any[]) || []).map((row: any) => ({
        id: row.id,
        status: row.status,
        tradeReferenceNumber: row.tradeReferenceNumber,
        note: row.note,
        createdAt: row.createdAt,
        lastActivityAt: row.lastActivityAt,
        direction: row.direction,
        itemCount: Number(row.itemCount) || 0,
        unreadCount: Number(row.unreadCount) || 0,
        declineReason: row.declineReason || null,
        otherUser: {
          id: row.otherUserId,
          username: row.otherUsername,
          displayName: row.otherDisplayName || row.otherUsername,
          avgRating: row.otherAvgRating ? String(row.otherAvgRating) : null,
          reviewCount: Number(row.otherReviewCount) || 0,
          ebayVerified: !!row.otherEbayVerified,
          facebookVerified: !!row.otherFacebookVerified,
          linkedinVerified: !!row.otherLinkedinVerified,
          paypalVerified: !!row.otherPaypalVerified,
          etsyVerified: !!row.otherEtsyVerified,
        },
        listing: {
          id: row.requestedListingId,
          title: row.listingTitle,
          image: row.listingImage,
          value: row.listingValue ? String(row.listingValue) : '0',
          category: row.listingCategory,
        },
      }));

      const trades = await Promise.all(baseTrades.map(async (trade: any) => {
        if (input.folder !== 'completed') return trade;

        const [offeredRows] = await db.execute(
          sql`SELECT ol.id, ol.title, ol.category, ol.estimatedValue,
            (SELECT imageUrl FROM listingPhotos WHERE listingId = ol.id ORDER BY sortOrder ASC LIMIT 1) as image
          FROM listings ol
          JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id
          WHERE tpi.proposalId = ${trade.id}
          ORDER BY tpi.id ASC`
        );

        const requestedItem = trade.listing?.id
          ? [{ id: trade.listing.id, title: trade.listing.title, category: trade.listing.category, value: trade.listing.value, image: trade.listing.image }]
          : [];
        const offeredItems = ((offeredRows as unknown as any[]) || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          value: item.estimatedValue ? String(item.estimatedValue) : '0',
          image: item.image,
        }));

        return {
          ...trade,
          completedExchange: buildCompletedTradeExchange(trade.direction, requestedItem, offeredItems),
        };
      }));

      return { trades };
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
    .input(z.object({ proposalId: z.number().int().positive(), adminView: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const isAdminReadOnly = input.adminView === true && ctx.user.role === 'admin';

      // Get the proposal
      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (!isAdminReadOnly && proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      // Admin inspection uses the requester as the display perspective, never as the authenticated actor.
      const viewerUserId = isAdminReadOnly ? proposal.requesterId : userId;

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
      const otherUserId = proposal.requesterId === viewerUserId ? proposal.recipientId : proposal.requesterId;
      const [otherUserResult] = await db.execute(
		  sql`SELECT u.id, u.username, u.name, u.paypalVerified, up.displayName, up.avatarUrl, up.bio,
          (SELECT AVG(rating) FROM tradeReviews WHERE revieweeId = u.id) as avgRating,
          (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = u.id) as reviewCount
        FROM users u
        LEFT JOIN userProfiles up ON up.userId = u.id
        WHERE u.id = ${otherUserId}`
      );
      let requesterUser: any = null;
      if (isAdminReadOnly) {
        const [requesterResult] = await db.execute(
          sql`SELECT u.id, u.username, u.name, up.displayName, up.avatarUrl
              FROM users u LEFT JOIN userProfiles up ON up.userId = u.id
              WHERE u.id = ${proposal.requesterId}`
        );
        requesterUser = (requesterResult as any)?.[0] || null;
      }

      // For accepted/shipped/completed stages, also fetch contact info for both parties
      let myContactInfo: any = null;
      let theirContactInfo: any = null;
      if (!isAdminReadOnly && ['accepted', 'shipping', 'shipped', 'completed', 'disputed'].includes(proposal.status as string)) {
        const [myContact] = await db.execute(
          sql`SELECT u.name, u.username, up.contactFullName, up.firstName, up.lastName, up.contactEmail, up.contactPhone,
            up.contactAddress, up.contactTown, up.contactState, up.contactZipCode, up.contactCountry
          FROM users u LEFT JOIN userProfiles up ON up.userId = u.id WHERE u.id = ${userId}`
        );
        const [theirContact] = await db.execute(
          sql`SELECT u.name, u.username, up.contactFullName, up.firstName, up.lastName, up.contactEmail, up.contactPhone,
            up.contactAddress, up.contactTown, up.contactState, up.contactZipCode, up.contactCountry
          FROM users u LEFT JOIN userProfiles up ON up.userId = u.id WHERE u.id = ${otherUserId}`
        );
        myContactInfo = (myContact as any)?.[0] || null;
        theirContactInfo = (theirContact as any)?.[0] || null;
        if (myContactInfo) myContactInfo.contactFullName = resolveTradeContactName(myContactInfo);
        if (theirContactInfo) theirContactInfo.contactFullName = resolveTradeContactName(theirContactInfo);
      }

      const [myReviewRows] = await db.execute(
        sql`SELECT id, rating, review, createdAt FROM tradeReviews WHERE proposalId = ${input.proposalId} AND reviewerId = ${viewerUserId} LIMIT 1`
      );
      const myReview = (myReviewRows as unknown as any[])?.[0] || null;

      // Fetch tracking numbers for shipping/shipped/completed trades
      let trackingNumbers: any[] = [];
      if (['accepted', 'shipping', 'shipped', 'completed', 'disputed'].includes(proposal.status as string)) {
        const [trackingResult] = await db.execute(
          sql`SELECT ttn.*, l.title as itemTitle FROM tradeTrackingNumbers ttn
            LEFT JOIN listings l ON l.id = ttn.listingId
            WHERE ttn.proposalId = ${input.proposalId}
            ORDER BY ttn.submittedAt ASC`
        );
        trackingNumbers = (trackingResult as any) || [];
      }

      // Check if partner has already accepted (first acceptance — waiting for mutual confirmation)
      let partnerHasAccepted = false;
      let myHasAccepted = false;
      if ((proposal.status as string) === 'negotiating' || (proposal.status as string) === 'accepted') {
        const [pendingAccept] = await db.execute(
          sql`SELECT id FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND userId = ${otherUserId} AND confirmationType = 'accepted'`
        );
        partnerHasAccepted = ((pendingAccept as unknown as any[])?.length || 0) > 0;
        const [myAccept] = await db.execute(
          sql`SELECT id FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND userId = ${viewerUserId} AND confirmationType = 'accepted'`
        );
        myHasAccepted = ((myAccept as unknown as any[])?.length || 0) > 0;
      }

      // Check if current user has confirmed receipt
      let myReceiptConfirmed = false;
      let theirReceiptConfirmed = false;
      let receiptConfirmations: any[] = [];
      if (['shipped', 'completed'].includes(proposal.status)) {
        const [receiptResult] = await db.execute(
          sql`SELECT userId, confirmationType, confirmedAt FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType IN ('received', 'damaged') ORDER BY confirmedAt ASC`
        );
        receiptConfirmations = (receiptResult as any) || [];
        const confirmedUserIds = receiptConfirmations.map((r: any) => r.userId);
        myReceiptConfirmed = confirmedUserIds.includes(viewerUserId);
        theirReceiptConfirmed = confirmedUserIds.includes(otherUserId);
      }

      // Get trade reference number and other new fields via raw SQL
      const [tradeExtra] = await db.execute(
        sql`SELECT tradeReferenceNumber, negotiatingAt, acceptedAt, shippingAt, shippedAt, completedAt, lastActivityAt, cashFromRequester, cashFromRecipient, middleManRequested, middleManApproved, declineReason, lastProposedBy, dailyRoomName, dailyRoomUrl, dailyRoomStartedBy FROM tradeProposals WHERE id = ${input.proposalId}`
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
          photos: (l as any).photos || [],
        })),
        otherUser: (otherUserResult as any)?.[0] || null,
        requesterUser,
        isRequester: proposal.requesterId === viewerUserId,
        isAdminReadOnly,
        myContactInfo,
        theirContactInfo,
        trackingNumbers,
        receiptConfirmations,
        myReceiptConfirmed,
        theirReceiptConfirmed,
        partnerHasAccepted,
        myHasAccepted,
        myReview,
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
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;

      let query = sql`SELECT l.id, l.ownerId, l.title, l.category, l.itemType, l.estimatedValue,
        l.condition, l.grade, l.certificationCompany, l.certificationNumber,
        l.description, l.itemDetails, l.signatures, l.status, l.isActive, l.createdAt,
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
      const itemList = items as unknown as any[];

      // Fetch ALL photos for each item (not just primary)
      const itemIds = itemList.map((i: any) => i.id);
      let allPhotos: any[] = [];
      if (itemIds.length > 0) {
        const [photoRows] = await db.execute(
          sql`SELECT listingId, imageUrl, sortOrder FROM listingPhotos WHERE listingId IN (${sql.raw(itemIds.join(','))}) ORDER BY sortOrder ASC`
        );
        allPhotos = photoRows as unknown as any[];
      }

      // Attach photos array to each item
      const itemsWithPhotos = itemList.map((item: any) => ({
        ...item,
        photos: allPhotos
          .filter((p: any) => p.listingId === item.id)
          .map((p: any) => ({ imageUrl: p.imageUrl, sortOrder: p.sortOrder })),
      }));

      return { items: itemsWithPhotos };
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
  // TIMELINE
  // ==========================================================================

  getTimeline: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive(), adminView: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const isAdminReadOnly = input.adminView === true && ctx.user.role === 'admin';

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (!isAdminReadOnly && proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      try {
        const [events] = await db.execute(
          sql`SELECT tal.id, tal.actorId,
                COALESCE(NULLIF(up.displayName, ''), NULLIF(CONCAT_WS(' ', up.firstName, up.lastName), ''), NULLIF(u.username, ''), tal.actorName, 'Tradebilia') as actorName,
                tal.eventType, tal.details, tal.createdAt
              FROM tradeActivityLog tal
              LEFT JOIN users u ON u.id = tal.actorId
              LEFT JOIN userProfiles up ON up.userId = tal.actorId
              WHERE tal.proposalId = ${input.proposalId}
              ORDER BY tal.createdAt ASC`
        );
        return { events: (events as unknown as any[]) || [] };
      } catch (error) {
        if (!isMissingTradeActivityLogError(error)) throw error;
        const [messages] = await db.execute(
          sql`SELECT tm.id, tm.senderId, tm.message, tm.messageType, tm.createdAt,
              COALESCE(NULLIF(up.displayName, ''), NULLIF(u.username, ''), 'Unknown') as actorName
            FROM tradeMessages tm
            LEFT JOIN users u ON u.id = tm.senderId
            LEFT JOIN userProfiles up ON up.userId = tm.senderId
            WHERE tm.proposalId = ${input.proposalId}
            ORDER BY tm.createdAt ASC`
        );
        const requesterName = await getUserDisplayName(db, proposal.requesterId);
        const recipientName = await getUserDisplayName(db, proposal.recipientId);
        return { events: buildLegacyTradeTimeline({ ...proposal, requesterName, recipientName }, messages as unknown as any[]) };
      }
    }),

  proceedToShipping: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
			if ((proposal.status as string) !== 'accepted') {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trade must be in accepted (Review) stage to proceed to shipping' });
			}

			const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;

      // Check if the other party has already confirmed proceeding to shipping
      const [existingConfirmation] = await db.execute(
        sql`SELECT id FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND userId = ${otherUserId} AND confirmationType = 'accepted'`
      );
      const otherHasConfirmed = ((existingConfirmation as unknown as any[])?.length || 0) > 0;
      const [ownConfirmation] = await db.execute(
        sql`SELECT id FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND userId = ${userId} AND confirmationType = 'accepted'`
      );
      if (((ownConfirmation as unknown as any[])?.length || 0) > 0) {
        return { success: true, mutualConfirmation: false, alreadyConfirmed: true };
      }

      const [actor] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const actorName = await getUserDisplayName(db, userId);

      if (otherHasConfirmed) {
        // Both have now confirmed — move to 'shipping' status
        const [transitionResult] = await db.execute(
          sql`UPDATE tradeProposals SET status = 'shipping', shippingAt = ${now}, shippingDeadline = COALESCE(shippingDeadline, DATE_ADD(${now}, INTERVAL 3 DAY)), lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId} AND status = 'accepted'`
        );
        if (Number((transitionResult as any)?.affectedRows ?? 0) !== 1) {
          return { success: true, mutualConfirmation: true, alreadyTransitioned: true };
        }
          await createTradeAlert(db, input.proposalId, otherUserId, 'accepted', `Both parties confirmed review for trade (TR-${proposal.tradeReferenceNumber})! Please enter your tracking number.`, now);
        await db.execute(
          sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${actorName}, 'proposal_accepted', 'Confirmed review. Both parties confirmed, proceeding to Shipping stage.', ${now})`
        );
        
        // Clean up the confirmation records
        await db.execute(
          sql`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType = 'accepted'`
        );
        
        return { success: true, mutualConfirmation: true };
      } else {
        // First confirmation — record it and notify other party
        await db.execute(
          sql`INSERT INTO tradeReceiptConfirmation (proposalId, userId, confirmationType, confirmedAt) VALUES (${input.proposalId}, ${userId}, 'accepted', ${now})`
        );
        await db.execute(
          sql`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
        );
          await createTradeAlert(db, input.proposalId, otherUserId, 'accepted', `Your trade partner confirmed the review for trade (TR-${proposal.tradeReferenceNumber}) and is ready to ship. Please confirm to proceed.`, now);
        await db.execute(
          sql`INSERT INTO tradeActivityLog (proposalId, actorId, actorName, eventType, details, createdAt) VALUES (${input.proposalId}, ${userId}, ${actorName}, 'proposal_accepted', 'Confirmed review — awaiting partner confirmation to proceed to Shipping.', ${now})`
        );
        
        return { success: true, mutualConfirmation: false };
      }
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

      // Alert other party — one alert per trade while unread
      const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
      await createTradeAlert(db, input.proposalId, otherUserId, 'initiated', 'New message in trade', now);

      return { success: true };
    }),

  getMessages: protectedProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
      adminView: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const isAdminReadOnly = input.adminView === true && ctx.user.role === 'admin';

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (!isAdminReadOnly && proposal.recipientId !== userId && proposal.requesterId !== userId) {
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
      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
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
      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Cryptographically strong opaque token; the database also rejects collisions.
      const token = randomBytes(32).toString('base64url');

      // Expires in 3 days
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      await db.execute(
        sql`INSERT INTO tradeVotingLinks (proposalId, generatedByUserId, linkToken, expiresAt, createdAt) VALUES (${input.proposalId}, ${userId}, ${token}, ${expiresAt}, ${now}) ON DUPLICATE KEY UPDATE generatedByUserId = VALUES(generatedByUserId), linkToken = VALUES(linkToken), expiresAt = VALUES(expiresAt), createdAt = VALUES(createdAt)`
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

      try {
        await db.execute(
          sql`INSERT INTO tradeVotes (votingLinkId, voterUserId, verdict, comment, createdAt) VALUES (${link.id}, ${userId}, ${input.verdict}, ${input.comment || null}, ${now})`
        );
      } catch (error: any) {
        if (error?.code === 'ER_DUP_ENTRY' || error?.cause?.code === 'ER_DUP_ENTRY') {
          throw new TRPCError({ code: 'CONFLICT', message: 'You have already voted on this trade.' });
        }
        throw error;
      }

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

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only trade participants can save private notes.' });
      }

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

      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only trade participants can view private notes.' });
      }

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

  getOrCreateVideoRoom: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      // Verify user is a participant in this trade
      const [rows] = await db.execute(
        sql`SELECT id, requesterId, recipientId, dailyRoomName, dailyRoomUrl
            FROM tradeProposals
            WHERE id = ${input.proposalId}
              AND (requesterId = ${userId} OR recipientId = ${userId})
            LIMIT 1`
      );
      const resolvedTrade = (rows as any)?.[0];
      if (!resolvedTrade) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found or access denied' });

      // If room already exists, update the caller and send invite message again
      if (resolvedTrade.dailyRoomName && resolvedTrade.dailyRoomUrl) {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // Update who started the call (caller may have changed)
        await db.execute(
          sql`UPDATE tradeProposals SET dailyRoomStartedBy = ${userId} WHERE id = ${input.proposalId}`
        );
        // Notify the other trader
        const otherUserId2 = resolvedTrade.requesterId === userId ? resolvedTrade.recipientId : resolvedTrade.requesterId;
        const [callerRows2] = await db.execute(sql`SELECT u.username, COALESCE(up.displayName, u.username) as displayName FROM users u LEFT JOIN userProfiles up ON up.userId = u.id WHERE u.id = ${userId} LIMIT 1`);
        const caller2 = (callerRows2 as any)?.[0];
        const callerName2 = caller2?.displayName || caller2?.username || 'Your trade partner';
        await db.execute(
          sql`INSERT INTO tradeMessages (proposalId, senderId, message, messageType, createdAt)
              VALUES (${input.proposalId}, ${userId}, ${`📹 ${callerName2} has started a video call. Click "Join Video Chat" to join.`}, 'system', ${now})`
        );
        return { roomUrl: resolvedTrade.dailyRoomUrl as string, roomName: resolvedTrade.dailyRoomName as string };
      }

      // Create a new Daily.co room for this trade
      const apiKey = process.env.DAILY_API_KEY;
      if (!apiKey) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Video chat is not configured' });

      const roomName = `trade-${input.proposalId}-${Date.now()}`;
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days

      const response = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            exp,
            max_participants: 2,
            enable_chat: false,
            enable_screenshare: false,
            start_video_off: false,
            start_audio_off: false,
          },
        }),
      });

      const data = await response.json() as any;
      if (!response.ok) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: data.info || 'Failed to create video room' });

      // Save room info to the trade (including who started it)
      await db.execute(
        sql`UPDATE tradeProposals SET dailyRoomName = ${data.name}, dailyRoomUrl = ${data.url}, dailyRoomStartedBy = ${userId} WHERE id = ${input.proposalId}`
      );

      // Notify the other trader via Trade Room chat only (no trade hub alert)
      const [callerRows] = await db.execute(sql`SELECT u.username, COALESCE(up.displayName, u.username) as displayName FROM users u LEFT JOIN userProfiles up ON up.userId = u.id WHERE u.id = ${userId} LIMIT 1`);
      const caller = (callerRows as any)?.[0];
      const callerName = caller?.displayName || caller?.username || 'Your trade partner';
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await db.execute(
        sql`INSERT INTO tradeMessages (proposalId, senderId, message, messageType, createdAt)
            VALUES (${input.proposalId}, ${userId}, ${`📹 ${callerName} has started a video call. Click "Join Video Chat" to join.`}, 'system', ${now})`
      );

      return { roomUrl: data.url as string, roomName: data.name as string };
    }),

  joinVideoCall: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      const [rows] = await db.execute(
        sql`SELECT id, requesterId, recipientId FROM tradeProposals
            WHERE id = ${input.proposalId}
              AND (requesterId = ${userId} OR recipientId = ${userId})
            LIMIT 1`
      );
      if (!(rows as any)?.[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found or access denied' });

      const [joinerRows] = await db.execute(sql`SELECT u.username, COALESCE(up.displayName, u.username) as displayName FROM users u LEFT JOIN userProfiles up ON up.userId = u.id WHERE u.id = ${userId} LIMIT 1`);
      const joiner = (joinerRows as any)?.[0];
      const joinerName = joiner?.displayName || joiner?.username || 'Your trade partner';
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await db.execute(
        sql`INSERT INTO tradeMessages (proposalId, senderId, message, messageType, createdAt)
            VALUES (${input.proposalId}, ${userId}, ${`📹 ${joinerName} has joined the video call.`}, 'system', ${now})`
      );

      return { success: true };
    }),

  endVideoCall: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      // Verify user is a participant
      const [rows] = await db.execute(
        sql`SELECT id, requesterId, recipientId FROM tradeProposals
            WHERE id = ${input.proposalId}
              AND (requesterId = ${userId} OR recipientId = ${userId})
            LIMIT 1`
      );
      if (!(rows as any)?.[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found or access denied' });

      // Clear the caller so buttons reset for both users
      await db.execute(
        sql`UPDATE tradeProposals SET dailyRoomStartedBy = NULL WHERE id = ${input.proposalId}`
      );

      // Post a system message that the call was ended
      const [enderRows] = await db.execute(sql`SELECT u.username, COALESCE(up.displayName, u.username) as displayName FROM users u LEFT JOIN userProfiles up ON up.userId = u.id WHERE u.id = ${userId} LIMIT 1`);
      const ender = (enderRows as any)?.[0];
      const enderName = ender?.displayName || ender?.username || 'A participant';
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        sql`INSERT INTO tradeMessages (proposalId, senderId, message, messageType, createdAt)
            VALUES (${input.proposalId}, ${userId}, ${`📵 ${enderName} has ended the video call.`}, 'system', ${now})`
      );

      return { success: true };
    }),

  dismissVideoCall: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      // Verify user is a participant
      const [rows] = await db.execute(
        sql`SELECT id, requesterId, recipientId, dailyRoomStartedBy
            FROM tradeProposals
            WHERE id = ${input.proposalId}
              AND (requesterId = ${userId} OR recipientId = ${userId})
            LIMIT 1`
      );
      const trade = (rows as any)?.[0];
      if (!trade) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found or access denied' });

      const callerId = trade.dailyRoomStartedBy;
      if (!callerId || callerId === userId) return { success: true }; // nothing to notify

      // Get dismisser's name
      const [dismisserRows] = await db.execute(sql`SELECT u.username, COALESCE(up.displayName, u.username) as displayName FROM users u LEFT JOIN userProfiles up ON up.userId = u.id WHERE u.id = ${userId} LIMIT 1`);
      const dismisser = (dismisserRows as any)?.[0];
      const dismisserName = dismisser?.displayName || dismisser?.username || 'Your trade partner';
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Clear the caller so buttons reset for both users
      await db.execute(
        sql`UPDATE tradeProposals SET dailyRoomStartedBy = NULL WHERE id = ${input.proposalId}`
      );

      // Post a system message in the trade chat only (no trade alert)
      await db.execute(
        sql`INSERT INTO tradeMessages (proposalId, senderId, message, messageType, createdAt)
            VALUES (${input.proposalId}, ${userId}, ${`📵 ${dismisserName} declined the video call.`}, 'system', ${now})`
      );

      return { success: true };
    }),

  analyzeTradeWithAI: protectedProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      myItems: z.array(z.object({
        id: z.number(),
        title: z.string(),
        category: z.string(),
        grade: z.string().optional(),
        condition: z.string().optional(),
        estimatedValue: z.number().optional(),
        itemDetails: z.string().optional(),
      })),
      theirItems: z.array(z.object({
        id: z.number(),
        title: z.string(),
        category: z.string(),
        grade: z.string().optional(),
        condition: z.string().optional(),
        estimatedValue: z.number().optional(),
        itemDetails: z.string().optional(),
      })),
      myCash: z.number().default(0),
      theirCash: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;

      // Verify user is a participant
      const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      if (proposal.requesterId !== userId && proposal.recipientId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      // Use items provided by client (fresh UI state)
      const myItems = input.myItems;
      const theirItems = input.theirItems;
      const myCash = input.myCash;
      const theirCash = input.theirCash;

      // Fetch eBay market prices for each item
      const ebayClientId = process.env.EBAY_PROD_CLIENT_ID;
      const ebayClientSecret = process.env.EBAY_PROD_CLIENT_SECRET;
      let ebayToken: string | null = null;

      if (ebayClientId && ebayClientSecret) {
        try {
          const credentials = Buffer.from(`${ebayClientId}:${ebayClientSecret}`).toString('base64');
          const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
          });
          const tokenData = await tokenRes.json() as any;
          if (tokenRes.ok) ebayToken = tokenData.access_token;
        } catch (_) {}
      }

      // Build a category-aware eBay search query for more accurate price results
      function buildEbayQuery(item: any): string {
        const details = item.itemDetails ? (() => { try { return JSON.parse(item.itemDetails); } catch { return {}; } })() : {};
        const rawGrade = parseFloat(item.grade || '0') > 0 ? item.grade : null;
        // Format grade: remove trailing zeros (9.80 -> 9.8, 10.00 -> 10)
        const grade = rawGrade ? String(parseFloat(rawGrade)) : null;
        // Clean cert name: strip " Comics", " Cards", etc. for cleaner eBay searches
        const rawCert = details.certificationCompany || details.customGradingCompany || null;
        const cert = rawCert ? rawCert.replace(/\s*(Comics|Cards|Grading)$/i, '').trim() : null;

        switch (item.category) {
          case 'sports_cards': {
            // Format: "[Year] [Manufacturer] [Player] #[CardNumber] [Cert] [Grade]"
            // e.g. "1996 Topps Kobe Bryant #138 PSA 10"
            const parts = [];
            if (details.year || details.releaseYear) parts.push(details.year || details.releaseYear);
            if (details.manufacturer) parts.push(details.manufacturer);
            if (details.player) parts.push(details.player);
            if (details.cardNumber) parts.push(`#${details.cardNumber}`);
            if (cert && grade) parts.push(`${cert} ${grade}`);
            else if (grade) parts.push(`Grade ${grade}`);
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          case 'pokemon': {
            // Format: "[CardName] [SetName] [Cert] [Grade]"
            const parts = [];
            if (details.cardName || details.player) parts.push(details.cardName || details.player);
            if (details.setName) parts.push(details.setName);
            if (cert && grade) parts.push(`${cert} ${grade}`);
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          case 'comics': {
            // Format: "[Title] [Issue] [Cert] [Grade]" e.g. "Daredevil 168 CGC 9.8"
            const parts = [];
            if (details.comicTitle) parts.push(details.comicTitle);
            if (details.issueNumber) parts.push(details.issueNumber); // no # prefix for eBay
            if (cert && grade) parts.push(`${cert} ${grade}`);
            else if (grade) parts.push(`Grade ${grade}`);
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          case 'video_games': {
            // Format: "[GameTitle] [Platform] [Cert] [Grade] [Sealed]"
            const parts = [];
            if (details.gameTitle) parts.push(details.gameTitle);
            if (details.platform) parts.push(details.platform);
            if (cert && grade) parts.push(`${cert} ${grade}`);
            if (details.sealed === 'yes') parts.push('Sealed');
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          case 'movies': {
            // Format: "[Title] [Format] [Cert] [Grade] [Sealed]"
            const parts = [];
            if (details.title) parts.push(details.title);
            if (details.format) parts.push(details.format);
            if (cert && grade) parts.push(`${cert} ${grade}`);
            if (details.sealed === 'yes') parts.push('Sealed');
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          case 'vintage_toys': {
            // Format: "[Brand] [ToyName] [Year] [Cert] [Grade]"
            const parts = [];
            if (details.brand) parts.push(details.brand);
            if (details.toyName) parts.push(details.toyName);
            if (details.year) parts.push(details.year);
            if (cert && grade) parts.push(`${cert} ${grade}`);
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          case 'coins': {
            // Format: "[Year] [Country] [Denomination] [Cert] [Grade]"
            const parts = [];
            if (details.year) parts.push(details.year);
            if (details.country) parts.push(details.country);
            if (details.denomination) parts.push(details.denomination);
            if (cert && grade) parts.push(`${cert} ${grade}`);
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          case 'stamps': {
            // Format: "[Year] [Country] [Denomination] [Cert] [Grade]"
            const parts = [];
            if (details.year) parts.push(details.year);
            if (details.country) parts.push(details.country);
            if (details.denomination) parts.push(details.denomination);
            if (cert && grade) parts.push(`${cert} ${grade}`);
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          case 'autographs': {
            // Format: "[SignedBy] autograph [AuthCompany]"
            const parts = [];
            if (details.signedBy) parts.push(details.signedBy);
            parts.push('autograph');
            if (details.authenticationCompany && details.authenticationCompany !== 'Other') parts.push(details.authenticationCompany);
            return parts.length > 1 ? parts.join(' ') : item.title;
          }
          default:
            return cert && grade ? `${item.title} ${cert} ${grade}` : item.title;
        }
      }

      // Rich eBay market metrics — returns avg, median, min, max, spread, count, confidence
      interface EbayMetrics {
        avg: number;
        median: number;
        min: number;
        max: number;
        spreadPct: number;  // (max-min)/avg * 100
        count: number;
        confidence: 'high' | 'medium' | 'low';
        fetchedAt: string;
      }

      async function getEbayMetrics(item: any): Promise<EbayMetrics | null> {
        if (!ebayToken) {
          console.log('[AI Analyzer] No eBay token — skipping price fetch for:', item.title);
          return null;
        }
        try {
          const query = buildEbayQuery(item);
          const estimatedValue = parseFloat(item.estimatedValue || '0');
          console.log(`[AI Analyzer] eBay query for "${item.title}": "${query}"`);

          // Fetch more results (25) so we can filter outliers more effectively
          const res = await fetch(
            `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=25&filter=buyingOptions%3A%7BFIXED_PRICE%7D`,
            { headers: { 'Authorization': `Bearer ${ebayToken}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' } }
          );
          const data = await res.json() as any;
          if (!data.itemSummaries?.length) {
            console.log(`[AI Analyzer] eBay returned 0 results for "${query}"`);
            return null;
          }

          let allPrices = data.itemSummaries
            .map((i: any) => parseFloat(i.price?.value || '0'))
            .filter((p: number) => p > 0)
            .sort((a: number, b: number) => a - b);
          if (!allPrices.length) return null;

          // Remove statistical outliers using IQR method to filter unrelated cheap/expensive listings
          const q1idx = Math.floor(allPrices.length * 0.25);
          const q3idx = Math.floor(allPrices.length * 0.75);
          const q1 = allPrices[q1idx];
          const q3 = allPrices[q3idx];
          const iqr = q3 - q1;
          const lowerFence = Math.max(q1 - 1.5 * iqr, 1);
          const upperFence = q3 + 1.5 * iqr;
          const prices = allPrices.filter((p: number) => p >= lowerFence && p <= upperFence);

          // Fall back to all prices if filtering removed too many
          const finalPrices = prices.length >= 3 ? prices : allPrices;

          const count = finalPrices.length;
          const avg = Math.round(finalPrices.reduce((a: number, b: number) => a + b, 0) / count);
          const mid = Math.floor(count / 2);
          const median = count % 2 !== 0 ? finalPrices[mid] : Math.round((finalPrices[mid - 1] + finalPrices[mid]) / 2);
          const min = Math.round(finalPrices[0]);
          const max = Math.round(finalPrices[count - 1]);
          const spreadPct = avg > 0 ? Math.round(((max - min) / avg) * 100) : 0;

          // Confidence: high = 7+ results with tight spread, medium = 4-6 or wide spread, low = <4
          let confidence: 'high' | 'medium' | 'low';
          if (count >= 7 && spreadPct < 80) confidence = 'high';
          else if (count >= 4) confidence = 'medium';
          else confidence = 'low';

          console.log(`[AI Analyzer] eBay metrics for "${query}": avg=$${avg} median=$${median} min=$${min} max=$${max} spread=${spreadPct}% count=${count}/${allPrices.length} (after outlier removal) confidence=${confidence}`);
          return { avg, median, min, max, spreadPct, count, confidence, fetchedAt: new Date().toISOString() };
        } catch (err: any) {
          console.log(`[AI Analyzer] eBay fetch error for "${item.title}":`, err?.message);
          return null;
        }
      }

      // Build enriched item descriptions with full eBay metrics
      const itemMetricsMap = new Map<number, EbayMetrics | null>();

      async function enrichItems(items: any[]): Promise<string> {
        const parts: string[] = [];
        for (const item of items) {
          const estimatedValue = parseFloat(item.estimatedValue || '0');
          const ebayQuery = buildEbayQuery(item); // precise identifier used for eBay search
          const metrics = await getEbayMetrics(item);
          itemMetricsMap.set(item.id, metrics);

          const details = item.itemDetails ? (() => { try { return JSON.parse(item.itemDetails); } catch { return {}; } })() : {};
          const certCompany = details.certificationCompany || details.customGradingCompany || null;

          let line = `- ${item.title}`;
          if (item.category) line += ` (${item.category.replace(/_/g, ' ')})`;
          // Include the precise eBay search query so the AI knows the exact item
          if (ebayQuery && ebayQuery !== item.title) line += ` | Precise Identifier: "${ebayQuery}"`;
          if (item.grade) line += ` | Grade: ${parseFloat(item.grade)}`;
          if (item.condition) line += ` | Condition: ${item.condition}`;
          if (certCompany) line += ` | Grading Company: ${certCompany}`;
          line += ` | Owner Estimated Value: $${estimatedValue.toLocaleString()} [UNVERIFIED]`;

          if (metrics) {
            line += ` | eBay Active Listings (${metrics.count} results, confidence: ${metrics.confidence}):`;
            line += ` Avg=$${metrics.avg.toLocaleString()}`;
            line += ` Median=$${metrics.median.toLocaleString()}`;
            line += ` Range=$${metrics.min.toLocaleString()}-$${metrics.max.toLocaleString()}`;
            line += ` PriceSpread=${metrics.spreadPct}%`;
            if (metrics.spreadPct > 100) line += ` [HIGH VARIANCE — market is inconsistent]`;
          } else {
            line += ` | eBay Data: UNAVAILABLE [use owner estimate with low confidence]`;
          }
          parts.push(line);
        }
        return parts.join('\n') || 'No items added yet';
      }

      const mySide = await enrichItems(myItems);
      const theirSide = await enrichItems(theirItems);
      console.log('[AI Analyzer] MY SIDE prompt data:', mySide);
      console.log('[AI Analyzer] THEIR SIDE prompt data:', theirSide);

      const myCashStr = myCash > 0 ? `\n- Cash sweetener: $${myCash.toLocaleString()}` : '';
      const theirCashStr = theirCash > 0 ? `\n- Cash sweetener: $${theirCash.toLocaleString()}` : '';

      // Call LLM for analysis
      // Compute value totals (estimated) to help the AI reason accurately
      const myEstimatedTotal = myItems.reduce((sum: number, i: any) => sum + parseFloat(i.estimatedValue || '0'), 0) + myCash;
      const theirEstimatedTotal = theirItems.reduce((sum: number, i: any) => sum + parseFloat(i.estimatedValue || '0'), 0) + theirCash;
      const estimatedDiff = theirEstimatedTotal - myEstimatedTotal;
      const valueDiffStr = estimatedDiff >= 0 ? `+$${Math.abs(estimatedDiff).toLocaleString()} in your favor (based on estimated values)` : `-$${Math.abs(estimatedDiff).toLocaleString()} against you (based on estimated values)`;

      // Compute eBay-based value totals using median prices from metrics map
      let myEbayTotal = myCash;
      let theirEbayTotal = theirCash;
      let totalDataPoints = 0;
      let allConfidenceLevels: string[] = [];

      for (const item of myItems) {
        const m = itemMetricsMap.get(item.id);
        if (m) { myEbayTotal += m.median; totalDataPoints += m.count; allConfidenceLevels.push(m.confidence); }
        else myEbayTotal += (typeof item.estimatedValue === 'number' ? item.estimatedValue : parseFloat(item.estimatedValue || '0'));
      }
      for (const item of theirItems) {
        const m = itemMetricsMap.get(item.id);
        if (m) { theirEbayTotal += m.median; totalDataPoints += m.count; allConfidenceLevels.push(m.confidence); }
        else theirEbayTotal += (typeof item.estimatedValue === 'number' ? item.estimatedValue : parseFloat(item.estimatedValue || '0'));
      }

      const ebayDiff = theirEbayTotal - myEbayTotal;
      const ebayDiffStr = ebayDiff > 0
        ? `+$${Math.abs(Math.round(ebayDiff)).toLocaleString()} IN YOUR FAVOR (you receive more eBay value than you give)`
        : ebayDiff < 0
        ? `-$${Math.abs(Math.round(ebayDiff)).toLocaleString()} AGAINST YOU (you give more eBay value than you receive)`
        : `$0 — perfectly balanced on eBay prices`;

      // Overall confidence score (1-10) based on data completeness
      const hasAllEbayData = allConfidenceLevels.length === (myItems.length + theirItems.length);
      const highCount = allConfidenceLevels.filter(c => c === 'high').length;
      const medCount = allConfidenceLevels.filter(c => c === 'medium').length;
      const overallConfidence = !hasAllEbayData ? 3
        : highCount === allConfidenceLevels.length ? 9
        : highCount + medCount >= allConfidenceLevels.length ? 7
        : 5;

      console.log(`[AI Analyzer] eBay gap: myTotal=$${myEbayTotal} theirTotal=$${theirEbayTotal} diff=${ebayDiffStr} overallConfidence=${overallConfidence}/10`);

      const prompt = `You are a professional collectibles trade analyst for Tradebilia. Evaluate this trade with the depth and precision of a seasoned appraiser.

=== DATA RULES (CRITICAL — FOLLOW EXACTLY) ===
1. The trade data below contains VERIFIED MARKET DATA (eBay listings) and UNVERIFIED OWNER ESTIMATES.
2. NEVER invent, substitute, or override verified numerical data with your own estimates.
3. If eBay data is marked UNAVAILABLE, use the owner estimate but explicitly label it as unverified and lower your confidence.
4. Clearly distinguish between: [VERIFIED DATA] vs [AI INTERPRETATION] vs [FUTURE PROJECTION].
5. Do NOT include URLs, citations, or links.
6. ALWAYS cite specific dollar amounts — never say "high value", always say "$3,399".

=== FAIRNESS SCORE RULE ===
- Score is from the perspective of the USER (the person reading this).
- 10 = STRONGLY IN YOUR FAVOR: you receive much more eBay value than you give.
- 5 = FAIR: both sides have roughly equal eBay value.
- 1 = STRONGLY IN THEIR FAVOR: you give much more eBay value than you receive.
- USE ONLY the pre-computed eBay gap below. Do not recalculate.
- Example: Give away $1,212 median eBay value, receive $3,399 → IN YOUR FAVOR, score 8.
- Example: Give away $3,399 median eBay value, receive $1,212 → IN THEIR FAVOR, score 2.

=== CATEGORY-SPECIFIC EVALUATION RULES ===
Evaluate each item using criteria appropriate to its category:
- SPORTS CARDS: Player legacy, rookie status, grade scarcity (PSA/BGS pop), sport popularity, Hall of Fame status, market liquidity.
- COMICS: Key issue status (first appearances, origin stories), creator significance, CGC/CBCS census, movie/TV potential, publisher, story importance.
- POKEMON / TCG: Set rarity, card mechanics, character popularity, PSA/CGC pop at grade, competitive vs collector demand.
- COINS: Mint, year, denomination, PCGS/NGC grade, surviving population, historical significance.
- VINTAGE TOYS: Brand, character, era, sealed vs opened, graded population, nostalgia factor.
- VIDEO GAMES: Platform, title rarity, WATA/VGA grade, sealed vs CIB, genre demand.
- AUTOGRAPHS: Signer significance, authentication company, item signed, provenance.
- GENERAL: Condition premium, historical significance, cultural relevance, collector demand.

=== TRADE DATA ===

**YOUR SIDE (what you are GIVING AWAY):**
${mySide}${myCashStr}

**THEIR SIDE (what you are RECEIVING):**
${theirSide}${theirCashStr}

=== PRE-COMPUTED METRICS (authoritative — do not override) ===
- eBay Median Value Gap: ${ebayDiffStr}
- Owner Estimated Value Gap: ${valueDiffStr}
- Data Confidence Level: ${overallConfidence}/10 (based on ${totalDataPoints} eBay data points)

=== RESPONSE FORMAT ===
Respond with ONLY this JSON object — no markdown, no code blocks, just raw JSON:
{
  "fairnessScore": <integer 1-10, based ONLY on the pre-computed eBay gap above>,
  "verdict": <"Strongly in Your Favor" | "In Your Favor" | "Roughly Fair" | "In Their Favor" | "Strongly in Their Favor">,
  "confidenceScore": ${overallConfidence},
  "summary": <2-3 sentences. Cite specific eBay median dollar amounts. State the true market value gap. Note where estimated values diverge from eBay data.>,
  "myItemInsights": <OBJECT (not string). Keys are exact item names from YOUR SIDE. Values are 3-5 sentence insights for that item. Example: { "Barry Sanders Score Rookie": "...", "Star Wars #1": "..." }. Cite owner estimate AND eBay avg/median/range for each. Explain WHY valued this way. Flag overvaluation or undervaluation.>,
  "myItemFuturePotential": <OBJECT (not string). Keys are exact item names from YOUR SIDE. Values are formatted as: "Bear: $X-Y | Base: $X-Y | Bull: $X-Y | Catalyst: [biggest driver] | Rating: X/10". Be specific with dollar ranges based on category and condition.>,
  "myItemStrengths": <OBJECT. Keys are exact item names from YOUR SIDE. Values are arrays of 2-4 strength strings, RANKED BY RELEVANCE TO THIS SPECIFIC TRADE (most important first). Example: ["Strong market demand", "Rare grade", "Popular player"]>,
  "myItemWeaknesses": <OBJECT. Keys are exact item names from YOUR SIDE. Values are arrays of 1-3 risk strings, RANKED BY SEVERITY (most critical first). Example: ["High market volatility", "Condition concerns"]>,
  "theirItemInsights": <OBJECT (not string). Keys are exact item names from THEIR SIDE. Values are 3-5 sentence insights for that item. No labels needed. Same format as myItemInsights.>,
  "theirItemFuturePotential": <OBJECT (not string). Keys are exact item names from THEIR SIDE. Values use same format as myItemFuturePotential: "Bear: $X-Y | Base: $X-Y | Bull: $X-Y | Catalyst: [driver] | Rating: X/10".>,
  "theirItemStrengths": <OBJECT. Keys are exact item names from THEIR SIDE. Values are arrays of 2-4 strength strings, RANKED BY RELEVANCE. Same format as myItemStrengths.>,
  "theirItemWeaknesses": <OBJECT. Keys are exact item names from THEIR SIDE. Values are arrays of 1-3 risk strings, RANKED BY SEVERITY. Same format as myItemWeaknesses.>,
  "crossCategoryComparison": <2-3 sentences comparing the two items directly: which has better liquidity, which has stronger long-term collector demand, which has better risk/reward profile, and why. Acknowledge if they are from different categories.>,
  "negotiationTip": <1 specific, actionable tip with dollar amounts based on the eBay median gap.>,
  "ebayDataUsed": <true if any eBay data was present, false otherwise>
}`;

      const llmResult = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are a collectibles trade analyst. Always respond with valid JSON only. No markdown, no code blocks, no explanation — just the raw JSON object.' },
          { role: 'user', content: prompt },
        ],
        maxTokens: 4000,
      });

      const content = llmResult.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI analysis failed' });

      // Strip markdown code fences if the LLM wrapped the JSON in ```json ... ```
      const rawContent = typeof content === 'string' ? content : JSON.stringify(content);
      const cleanContent = rawContent
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let analysis: any;
      try {
        analysis = JSON.parse(cleanContent);
        console.log('[AI Analyzer] Parsed fields:', Object.keys(analysis).join(', '));
        console.log('[AI Analyzer] myItemFuturePotential:', analysis.myItemFuturePotential ? 'PRESENT' : 'MISSING');
        console.log('[AI Analyzer] theirItemFuturePotential:', analysis.theirItemFuturePotential ? 'PRESENT' : 'MISSING');
      } catch (parseErr) {
        // Log the raw content for debugging and throw a user-friendly error
        console.error('[AI Analyzer] JSON parse failed. Raw content:', cleanContent.slice(0, 500));
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI analysis returned an invalid response. Please try again.' });
      }

      // Strip any citation links the LLM may have included despite instructions
      const stripCitations = (text: unknown): string => {
        const str = typeof text === 'string'
          ? text
          : Array.isArray(text)
            ? text.map((t: unknown) => (typeof t === 'string' ? t : (t == null ? '' : JSON.stringify(t)))).join(' ')
            : text == null ? '' : (typeof text === 'object' ? JSON.stringify(text) : String(text));
        return str
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
          .replace(/https?:\/\/\S+/g, '')           // bare URLs
          .trim();
      };

      if (analysis.summary) analysis.summary = stripCitations(analysis.summary);
      
      // Strip citations from per-item insights (objects keyed by item name)
      if (typeof analysis.myItemInsights === 'object' && !Array.isArray(analysis.myItemInsights)) {
        Object.keys(analysis.myItemInsights).forEach(key => {
          analysis.myItemInsights[key] = stripCitations(analysis.myItemInsights[key]);
        });
      }
      if (typeof analysis.myItemFuturePotential === 'object' && !Array.isArray(analysis.myItemFuturePotential)) {
        Object.keys(analysis.myItemFuturePotential).forEach(key => {
          analysis.myItemFuturePotential[key] = stripCitations(analysis.myItemFuturePotential[key]);
        });
      }
      if (typeof analysis.theirItemInsights === 'object' && !Array.isArray(analysis.theirItemInsights)) {
        Object.keys(analysis.theirItemInsights).forEach(key => {
          analysis.theirItemInsights[key] = stripCitations(analysis.theirItemInsights[key]);
        });
      }
      if (typeof analysis.theirItemFuturePotential === 'object' && !Array.isArray(analysis.theirItemFuturePotential)) {
        Object.keys(analysis.theirItemFuturePotential).forEach(key => {
          analysis.theirItemFuturePotential[key] = stripCitations(analysis.theirItemFuturePotential[key]);
        });
      }
      
      if (analysis.negotiationTip) analysis.negotiationTip = stripCitations(analysis.negotiationTip);
      if (analysis.crossCategoryComparison) analysis.crossCategoryComparison = stripCitations(analysis.crossCategoryComparison);
      
      // Strip citations from strength/weakness objects (keyed by item name, values are arrays)
      if (typeof analysis.myItemStrengths === 'object' && !Array.isArray(analysis.myItemStrengths)) {
        Object.keys(analysis.myItemStrengths).forEach(key => {
          if (Array.isArray(analysis.myItemStrengths[key])) {
            analysis.myItemStrengths[key] = analysis.myItemStrengths[key].map(stripCitations);
          }
        });
      }
      if (typeof analysis.myItemWeaknesses === 'object' && !Array.isArray(analysis.myItemWeaknesses)) {
        Object.keys(analysis.myItemWeaknesses).forEach(key => {
          if (Array.isArray(analysis.myItemWeaknesses[key])) {
            analysis.myItemWeaknesses[key] = analysis.myItemWeaknesses[key].map(stripCitations);
          }
        });
      }
      if (typeof analysis.theirItemStrengths === 'object' && !Array.isArray(analysis.theirItemStrengths)) {
        Object.keys(analysis.theirItemStrengths).forEach(key => {
          if (Array.isArray(analysis.theirItemStrengths[key])) {
            analysis.theirItemStrengths[key] = analysis.theirItemStrengths[key].map(stripCitations);
          }
        });
      }
      if (typeof analysis.theirItemWeaknesses === 'object' && !Array.isArray(analysis.theirItemWeaknesses)) {
        Object.keys(analysis.theirItemWeaknesses).forEach(key => {
          if (Array.isArray(analysis.theirItemWeaknesses[key])) {
            analysis.theirItemWeaknesses[key] = analysis.theirItemWeaknesses[key].map(stripCitations);
          }
        });
      }
      // Ensure confidenceScore is always present
      if (!analysis.confidenceScore) analysis.confidenceScore = overallConfidence;

      // OVERRIDE fairness score with server-computed value based on eBay gap
      // This ensures accuracy regardless of LLM interpretation
      const computedFairnessScore = (() => {
        const absGap = Math.abs(ebayDiff);
        if (ebayDiff > 0) {
          // Positive gap = you receive more = in your favor
          if (absGap >= 5000) return 9; // Strongly in your favor
          if (absGap >= 2000) return 7; // In your favor
          if (absGap >= 500) return 6;  // Slightly in your favor
        } else if (ebayDiff < 0) {
          // Negative gap = you give more = against you
          if (absGap >= 5000) return 2; // Strongly against you
          if (absGap >= 2000) return 3; // Against you
          if (absGap >= 500) return 4;  // Slightly against you
        }
        return 5; // Roughly fair (gap < $500)
      })();
      analysis.fairnessScore = computedFairnessScore;

      // Convert confidence score from 1-10 to percentage (10-100)
      analysis.confidenceScore = Math.round((analysis.confidenceScore / 10) * 100);

      return analysis;
    }),
});
