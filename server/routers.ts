import { z } from "zod";
import { verifyPayPalTransaction } from "./paypal";
import { COOKIE_NAME } from "@shared/const";
import { collectibleCategories, itemConditions, mysqlNow, toMysqlDateTime } from "./db";
import { isValidGradeForCompany, getGradingCompanyByName } from "@shared/gradingCompanyConfig";
import {
  createListing,
  updateListing,
  createTradeProposal,
  getDashboardData,
  getListingDetail,
  getMarketplaceFeed,
  leaveTradeReview,
  respondToTradeProposal,
  searchMembers,
  selectTradeProposalItems,
  sendTradeMessage,
  toggleWatchlist,
  updateProfile,
  toggleListingStatus,
  bulkUpdateListingStatus,
  bulkDeleteListings,
  restoreDeletedListings,
  getUnreadMessageCount,
  saveDraft,
  getDrafts,
  getDraftById,
  updateDraft,
  deleteDraft,
  getSiteStatistics,
  submitUserReport,
  getUserReports,
  getTopHighestValueItems,
  getUserReportDetails,
  updateReportStatus,
  updateUserEbayInfo,
  getUserEbayInfo,
  storeEbayFeedback,
  getUserEbayFeedback,
  flagLowFeedback,
  getUserFacebookInfo,
  getUserLinkedInInfo,
  getLowFeedbackFlags,
  sendItemInquiry,
  getUnreadInquiries,
  getInquiriesByUser,
  markInquiryAsRead,
  sendInquiryReply,
  getRepliesByInquiry,
  deleteInquiry,
  getDeletedInquiries,
  emptyDeletedInquiries,
  createForumPost,
  getForumPosts,
  getForumPostById,
  addForumReply,
  getForumReplies,
  createReferralRequest,
  getAllReferralRequests,
  updateReferralRequestStatus,
  getUnsentReferrals,
  markReferralsAsEmailed,
  markReferralAsJoined,
  removeReferral,
  getReferralsByIds,
  trackListingView,
  addToFavorites,
  removeFromFavorites,
  isFavorited,
  getTopMostFavoritedItems,
  getTopMostViewedItems,
  adminDeleteListing,
  adminBulkDeleteListings,
  getConventions,
  getUpcomingConventions,
  submitConvention,
  getPendingConventions,
  approveConvention,
  rejectConvention,
  deleteConvention,
  suspendUser,
  unsuspendUser,
  getSuspendedUsers,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { notifyOwner } from "./_core/notification";
import { sendNewDirectMessageEmail, sendDirectMessageReplyEmail, sendReferralInviteEmail } from "./_core/email";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { hashPassword, verifyPassword, isValidUsername, isValidPassword, isValidEmail } from "./_core/auth";
import bcrypt from 'bcryptjs';
import { getUserByUsername, createUser, requireDb } from "./db";
import { getEbayAuthUrl, exchangeCodeForToken, getUserInfo, getUserFeedback, refreshAccessToken } from "./_core/ebay";
import { sdk } from "./_core/sdk";
import { tradeFlowRouter } from "./tradeFlowRouter";
import { customAuth } from "./_core/customAuth";
import { users, userProfiles, listings, deletedAccounts, tradeProposals, tradeMessages, tradeReviews, watchlistEntries, draftListings, passwordResetTokens, referralRequests, userFollows, directMessageThreads, directMessages, tradePayments, tradeActivityLog, emailTemplates } from "../drizzle/schema";
import { eq, sql, desc, or, inArray, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ONE_YEAR_MS } from "@shared/const";

const uploadedImageSchema = z.object({
  name: z.string().max(200).optional().default(''),
  type: z.string().max(120).optional().default(''),
  contentBase64: z.string().min(1).optional(), // Optional: only present for new uploads
  imageUrl: z.string().optional(), // Optional: present for existing photos
  previewUrl: z.string().optional(), // Optional: frontend preview URL
});

const listingFiltersSchema = z.object({
  category: z.enum(collectibleCategories).optional(),
  condition: z.enum(itemConditions).optional(),
  keyword: z.string().max(100).optional(),
  issueNumber: z.string().max(50).optional(),
  manufacturer: z.string().max(100).optional(),
  year: z.string().max(50).optional(),
  team: z.string().max(100).optional(),
  series: z.string().max(100).optional(),
  sport: z.string().max(50).optional(),
  gradingService: z.string().max(100).optional(),
  grade: z.string().max(10).optional(),
  valueMin: z.number().optional(),
  valueMax: z.number().optional(),
  rookie: z.string().max(10).optional(),
  autographed: z.string().max(10).optional(),
  signed: z.string().max(10).optional(),
  facsimile: z.string().max(10).optional(),
  // Dedicated per-filter parameters (each filter owns its own channel)
  title: z.string().max(160).optional(),
  system: z.string().max(60).optional(),
  region: z.string().max(60).optional(),
  country: z.string().max(100).optional(),
  format: z.string().max(60).optional(),
  medium: z.string().max(60).optional(),
  denomination: z.string().max(60).optional(),
  mintMark: z.string().max(20).optional(),
  issuer: z.string().max(100).optional(),
  edition: z.string().max(60).optional(),
  parkOrEvent: z.string().max(100).optional(),
  franchise: z.string().max(100).optional(),
  rarity: z.string().max(60).optional(),
});

const memberSearchSchema = z.object({
  query: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  verification: z.enum(["all", "verified", "established", "rising"]).optional(),
});

const reportUserSchema = z.object({
  reportedMember: z.string().min(2).max(160),
  listingReference: z.string().max(240).optional(),
  concernType: z.enum([
    "Counterfeit or inaccurate item description",
    "Harassment or abusive conduct",
    "Spam, solicitation, or scam activity",
    "Unsafe trade behavior",
    "Unauthorized contact information sharing",
    "Other community concern",
  ]),
  contactEmail: z.string().email().max(320),
  details: z.string().min(20).max(3000),
  supportingNotes: z.string().max(2000).optional(),
});

const referralRequestSchema = z.object({
  friendName: z.string().min(2).max(160),
  friendEmail: z.string().email().max(320),
  collectorFocus: z.string().min(2).max(200),
  isMerchant: z.boolean().default(false),
  message: z.string().min(20).max(2000),
});

export const appRouter = router({
  system: systemRouter,
  tradeFlow: tradeFlowRouter,
  auth: router({
    me: publicProcedure.query(async opts => {
      const user = opts.ctx.user;
      if (!user) {
        return null;
      }

      
      const db = await requireDb();
      
      const profile = await db
        .select({
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          avatarUrl: userProfiles.avatarUrl,
          displayName: userProfiles.displayName,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);
      
      return {
        ...user,
        firstName: profile[0]?.firstName ?? null,
        lastName: profile[0]?.lastName ?? null,
        avatarUrl: profile[0]?.avatarUrl ?? null,
        displayName: profile[0]?.displayName ?? (user as any).displayName ?? null,
      };
    }),
    signup: publicProcedure
      .input(
        z.object({
          username: z.string().min(3).max(32),
          password: z.string().min(8),
          displayName: z.string().min(1).max(255),
          email: z.string().email().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (!isValidUsername(input.username)) {
          throw new Error("Username must be 3-32 characters, alphanumeric with underscores/hyphens");
        }
        if (!isValidPassword(input.password)) {
          throw new Error("Password must be at least 8 characters with uppercase, lowercase, and number");
        }
        if (input.email && !isValidEmail(input.email)) {
          throw new Error("Invalid email format");
        }

        const existing = await getUserByUsername(input.username);
        if (existing) {
          throw new Error("Username already taken");
        }

        const passwordHash = await hashPassword(input.password);
        const userId = await createUser({
          username: input.username,
          passwordHash,
          displayName: input.displayName,
          email: input.email,
        });

        const sessionToken = await customAuth.createSessionToken(
          userId,
          input.username,
          'user',
          { expiresInMs: ONE_YEAR_MS }
        );

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, userId };
      }),
    signin: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        // NOTE: do not log password/hash details — sensitive material was
        // previously written to server logs here.
        const user = await getUserByUsername(input.username);
        if (!user || !user.passwordHash) {
          throw new Error("Invalid username or password");
        }

        const passwordMatch = await verifyPassword(input.password, user.passwordHash);
        if (!passwordMatch) {
          throw new Error("Invalid username or password");
        }

        // Block banned users from logging in
        if ((user as any).isBanned === 1) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Your account has been permanently banned. If you believe this is an error, please contact support.',
          });
        }

        const { customAuth } = await import("./_core/customAuth");
        const sessionToken = await customAuth.createSessionToken(
          user.id,
          user.username || "",
          user.role || "user",
          { expiresInMs: ONE_YEAR_MS }
        );

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, userId: user.id };
      }),
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      // Clear lastActivityAt to mark user as offline (set to a very old date)
      if (ctx.user?.id) {
        // Use a date far in the past (year 1970) to ensure user is marked as offline
        const offlineTime = toMysqlDateTime(new Date('1970-01-02T00:00:00Z'));
        await db.update(users).set({ lastActivityAt: offlineTime }).where(eq(users.id, ctx.user.id));
      }
      
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    unreadCounts: protectedProcedure.query(async ({ ctx }) => {
      const unreadMessagesResult = await getUnreadMessageCount(ctx.user.id);
      return {
        unreadMessages: unreadMessagesResult?.count ?? 0,
      };
    }),
  }),


  members: router({
    search: publicProcedure.input(memberSearchSchema.optional()).query(({ input }) => {
      return searchMembers(input ?? {});
    }),
  }),
  market: router({
    feed: publicProcedure.input(listingFiltersSchema.optional()).query(({ ctx, input }) => {
      return getMarketplaceFeed(input ?? {}, ctx.user?.id ?? null);
    }),
    siteStatistics: publicProcedure.query(() => {
      return getSiteStatistics();
    }),
    topHighestValueItems: publicProcedure.query(({ ctx }) => {
      return getTopHighestValueItems(ctx.user?.id ?? null);
    }),
    getUserProfile: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const db = await requireDb();
        const [user] = await db.execute(
          sql`SELECT
            u.id,
            u.username,
            u.email,
            u.displayName,
            u.avatarUrl,
            u.role,
            u.createdAt,
            u.lastSignedIn,
            u.lastActivityAt,
            u.ebayUsername,
            u.ebayFeedbackScore,
            u.ebayFeedbackPercentage,
            u.ebayMemberSince,
            u.ebayConnectedAt,
            u.ebaySellerLevel,
            u.ebayIdVerified,
            u.ebay_star as ebayStar,
            u.ebay_positive_12mo as ebayPositive12mo,
            u.ebay_neutral_12mo as ebayNeutral12mo,
            u.ebay_negative_12mo as ebayNegative12mo,
            u.ebay_is_store_owner as ebayIsStoreOwner,
            u.facebookId,
            u.facebookName,
            u.facebookVerified,
            u.facebookConnectedAt,
            u.facebookEmail,
            u.facebookPicture,
            u.facebookLocation,
            u.facebookLink,
            u.facebookLikes,
            u.linkedinId,
            u.linkedinName,
            u.linkedinEmail,
            u.linkedinPicture,
            u.linkedinHeadline,
            u.linkedinProfileUrl,
            u.linkedinConnectedAt
          FROM users u
          WHERE u.id = ${input.userId}`
        );

        // db.execute returns [rows, fields] — rows is the array of results
        const userRow = Array.isArray(user) ? (user as any[])[0] : user;

        if (!userRow) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        const [profileRows] = await db.execute(
          sql`SELECT * FROM userProfiles WHERE userId = ${input.userId}`
        );
        const profileRow = Array.isArray(profileRows) ? (profileRows as any[])[0] : profileRows;

        const [recentListingsRows] = await db.execute(
          sql`SELECT 
            l.id, l.title, l.category, l.condition, l.grade, l.certificationCompany, l.estimatedValue, l.description, l.itemType,
            (SELECT lp.imageUrl FROM listingPhotos lp WHERE lp.listingId = l.id ORDER BY lp.sortOrder ASC LIMIT 1) as primaryPhotoUrl
          FROM listings l 
          WHERE l.ownerId = ${input.userId} AND l.status = 'active' AND l.isActive = 1
          ORDER BY l.createdAt DESC LIMIT 24`
        );
        const recentListingsArr = Array.isArray(recentListingsRows) ? recentListingsRows : [];
        
        // Fetch real stats + per-category rating averages
        const [statsRows] = await db.execute(
          sql`SELECT 
            (SELECT COUNT(*) FROM listings WHERE ownerId = ${input.userId} AND status = 'active' AND isActive = 1) as itemsListed,
            (SELECT COUNT(*) FROM tradeProposals WHERE (requesterId = ${input.userId} OR recipientId = ${input.userId}) AND status = 'completed') as completedTrades,
            (SELECT AVG(overallRating) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1) as avgRating,
            (SELECT AVG(tradeExperienceRating) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND tradeExperienceRating IS NOT NULL) as avgTradeExperience,
            (SELECT AVG(itemConditionRating) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND itemConditionRating IS NOT NULL) as avgItemCondition,
            (SELECT AVG(communicationRating) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND communicationRating IS NOT NULL) as avgCommunication,
            (SELECT AVG(shippingSpeedRating) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND shippingSpeedRating IS NOT NULL) as avgShippingSpeed,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND overallRating >= 4.5) as fiveStar,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND overallRating >= 3.5 AND overallRating < 4.5) as fourStar,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND overallRating >= 2.5 AND overallRating < 3.5) as threeStar,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND overallRating >= 1.5 AND overallRating < 2.5) as twoStar,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1 AND overallRating < 1.5) as oneStar
          `
        );
        const stats = Array.isArray(statsRows) ? (statsRows as any[])[0] : (statsRows as any) || { itemsListed: 0, completedTrades: 0, avgRating: 0 };

        // Fetch reviews
        const [reviewsRows] = await db.execute(
          sql`SELECT 
            tr.id, tr.overallRating, tr.review, tr.createdAt, 
            up.displayName as reviewerName, up.avatarUrl as reviewerAvatar, u.username as reviewerUsername
          FROM tradeReviews tr
          LEFT JOIN users u ON u.id = tr.reviewerId
          LEFT JOIN userProfiles up ON up.userId = tr.reviewerId
          WHERE tr.revieweeId = ${input.userId} AND tr.isVisible = 1
          ORDER BY tr.createdAt DESC
          LIMIT 20`
        );
        const reviews = Array.isArray(reviewsRows) ? reviewsRows : [];

        return {
          user: userRow,
          profile: profileRow || null,
          stats: {
            itemsListed: stats.itemsListed || 0,
            completedTrades: stats.completedTrades || 0,
            avgRating: parseFloat(stats.avgRating || '0').toFixed(1),
            avgTradeExperience: parseFloat(stats.avgTradeExperience || '0').toFixed(1),
            avgItemCondition: parseFloat(stats.avgItemCondition || '0').toFixed(1),
            avgCommunication: parseFloat(stats.avgCommunication || '0').toFixed(1),
            avgShippingSpeed: parseFloat(stats.avgShippingSpeed || '0').toFixed(1),
            histogram: {
              five: parseInt(stats.fiveStar || '0'),
              four: parseInt(stats.fourStar || '0'),
              three: parseInt(stats.threeStar || '0'),
              two: parseInt(stats.twoStar || '0'),
              one: parseInt(stats.oneStar || '0'),
            },
          },
          reviews,
          recentListings: recentListingsArr,
        };
      }),
    search: publicProcedure
      .input(
        z.object({
          query: z.string().max(100),
          category: z.enum(collectibleCategories).optional(),
          condition: z.enum(itemConditions).optional(),
        }),
      )
      .query(({ ctx, input }) => {
        return getMarketplaceFeed(
          {
            keyword: input.query,
            category: input.category,
            condition: input.condition,
          },
          ctx.user?.id ?? null,
        );
      }),
    dashboard: protectedProcedure.query(({ ctx }) => {
      return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
    }),
    listingDetail: publicProcedure
      .input(
        z.object({
          listingId: z.number().int().positive(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const detail = await getListingDetail(input.listingId, ctx.user?.id ?? null);
        return { listing: detail };
      }),
    saveProfile: protectedProcedure
      .input(
        z.object({
          // DEPRECATED: retained for client compatibility but IGNORED server-side.
          // The authenticated session (ctx.user.id) is the only trusted identity.
          // Previously this public procedure trusted a client-supplied userId,
          // letting anonymous visitors overwrite any user's profile.
          userId: z.union([z.string(), z.number()]).optional(),
          displayName: z.string().min(2).max(120),
          bio: z.string().max(500).optional(),
          contactFullName: z.string().max(160).optional(),
          contactEmail: z.string().email().max(320).optional().or(z.literal("")),
          contactPhone: z.string().max(40).optional(),
          contactAddress: z.string().max(320).optional(),
          contactTown: z.string().max(100).optional(),
          contactState: z.string().max(100).optional(),
          contactZipCode: z.string().max(20).optional(),
          contactCountry: z.string().max(100).optional(),
          firstName: z.string().max(100).optional(),
          lastName: z.string().max(100).optional(),
          avatar: uploadedImageSchema.nullable().optional(),
          acceptedTerms: z.boolean().optional(),
          isMerchant: z.boolean().optional(),
          storeName: z.string().max(255).optional(),
          businessLicense: z.string().max(255).optional(),
          taxId: z.string().max(100).optional(),
          storeDescription: z.string().optional(),
          businessAddress: z.string().optional(),
          businessPhone: z.string().max(40).optional(),
          businessEmail: z.string().email().max(320).optional().or(z.literal("")),
          businessWebsite: z.string().max(512).optional(),
          securityQuestion: z.string().max(255).optional(),
          securityAnswer: z.string().max(255).optional(),
          preferredCategories: z.array(z.enum(collectibleCategories)).optional(),
          notificationPreferences: z.object({
            tradeInitiated: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            counterProposal: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            proposalAccepted: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            proposalRejected: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            itemsShipped: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            itemsReceived: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            feedbackReceived: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            systemUpdates: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            marketingEmails: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
            messages: z.object({ email: z.boolean(), text: z.boolean() }).optional(),
          }).optional(),
          emailVerified: z.boolean().optional(),
          phoneVerified: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Never trust input.userId — only the authenticated session identity.
        const userId = ctx.user.id;

        // SECURITY: Identity fields can only be modified by admins — EXCEPT
        // during first-time account setup (before the profile is completed),
        // when the user legitimately provides their own identity information.
        // Without this exception, every new non-admin signup would be blocked
        // with FORBIDDEN at Account Setup step 3.
        const isAdmin = ctx.user.role === 'admin';
        const db0 = await requireDb();
        const existingProfile = await db0
          .select({ acceptedTerms: userProfiles.acceptedTerms })
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
          .limit(1);
        const isFirstTimeSetup = !existingProfile[0] || !existingProfile[0].acceptedTerms;

        // Check if any identity field is being modified by a non-admin user after first-time setup
        if (!isAdmin && !isFirstTimeSetup) {
          const identityFieldsAttempted = [];
          if (input.firstName !== undefined && input.firstName) identityFieldsAttempted.push('firstName');
          if (input.lastName !== undefined && input.lastName) identityFieldsAttempted.push('lastName');
          if (input.contactEmail !== undefined && input.contactEmail) identityFieldsAttempted.push('contactEmail');
          if (input.contactAddress !== undefined && input.contactAddress) identityFieldsAttempted.push('contactAddress');
          if (input.contactTown !== undefined && input.contactTown) identityFieldsAttempted.push('contactTown');
          if (input.contactState !== undefined && input.contactState) identityFieldsAttempted.push('contactState');
          if (input.contactZipCode !== undefined && input.contactZipCode) identityFieldsAttempted.push('contactZipCode');
          if (input.contactCountry !== undefined && input.contactCountry) identityFieldsAttempted.push('contactCountry');
          if (input.contactPhone !== undefined && input.contactPhone) identityFieldsAttempted.push('contactPhone');
          if (input.contactFullName !== undefined && input.contactFullName) identityFieldsAttempted.push('contactFullName');
          
          if (identityFieldsAttempted.length > 0) {
            console.warn(
              `[saveProfile] Non-admin user ${userId} attempted to modify identity fields:`,
              identityFieldsAttempted
            );
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Identity fields cannot be modified after account setup. These fields were verified during setup and can only be changed by administrators. Contact support if you need to update them.',
            });
          }
        }
        
        // Merchant/store fields are ALWAYS locked for non-admins, even during first-time setup
        if (!isAdmin) {
          const merchantFieldsAttempted = [];
          if (input.isMerchant !== undefined) merchantFieldsAttempted.push('isMerchant');
          if (input.storeName !== undefined && input.storeName) merchantFieldsAttempted.push('storeName');
          if (input.businessLicense !== undefined && input.businessLicense) merchantFieldsAttempted.push('businessLicense');
          if (input.taxId !== undefined && input.taxId) merchantFieldsAttempted.push('taxId');
          if (input.storeDescription !== undefined && input.storeDescription) merchantFieldsAttempted.push('storeDescription');
          if (input.businessAddress !== undefined && input.businessAddress) merchantFieldsAttempted.push('businessAddress');
          if (input.businessPhone !== undefined && input.businessPhone) merchantFieldsAttempted.push('businessPhone');
          if (input.businessEmail !== undefined && input.businessEmail) merchantFieldsAttempted.push('businessEmail');
          if (input.businessWebsite !== undefined && input.businessWebsite) merchantFieldsAttempted.push('businessWebsite');
          
          if (merchantFieldsAttempted.length > 0) {
            console.warn(
              `[saveProfile] Non-admin user ${userId} attempted to modify merchant fields:`,
              merchantFieldsAttempted
            );
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Merchant and store information cannot be modified. Contact support if you need to update these details.',
            });
          }
        }
        
        // Identity and merchant fields are persisted when the caller is an admin OR this is
        // the user's first-time account setup (their own verified info).
        const canWriteLockedFields = isAdmin || isFirstTimeSetup;
        return updateProfile(
          { id: userId, name: input.displayName },
          {
            displayName: input.displayName,
            bio: input.bio,
            contactFullName: canWriteLockedFields ? input.contactFullName : undefined,
            contactEmail: canWriteLockedFields ? input.contactEmail : undefined,
            contactPhone: canWriteLockedFields ? input.contactPhone : undefined,
            contactAddress: canWriteLockedFields ? input.contactAddress : undefined,
            contactTown: canWriteLockedFields ? input.contactTown : undefined,
            contactState: canWriteLockedFields ? input.contactState : undefined,
            contactZipCode: canWriteLockedFields ? input.contactZipCode : undefined,
            contactCountry: canWriteLockedFields ? input.contactCountry : undefined,
            firstName: canWriteLockedFields ? input.firstName : undefined,
            lastName: canWriteLockedFields ? input.lastName : undefined,
            avatar: input.avatar ? { name: input.avatar.name, type: input.avatar.type, contentBase64: input.avatar.contentBase64! } : null,
            acceptedTerms: input.acceptedTerms,
            // Merchant fields are only writable by admins
            isMerchant: isAdmin ? input.isMerchant : undefined,
            storeName: isAdmin ? input.storeName : undefined,
            businessLicense: isAdmin ? input.businessLicense : undefined,
            taxId: isAdmin ? input.taxId : undefined,
            storeDescription: isAdmin ? input.storeDescription : undefined,
            businessAddress: isAdmin ? input.businessAddress : undefined,
            businessPhone: isAdmin ? input.businessPhone : undefined,
            businessEmail: isAdmin ? input.businessEmail : undefined,
            businessWebsite: isAdmin ? input.businessWebsite : undefined,
            securityQuestion: input.securityQuestion,
            securityAnswer: input.securityAnswer,
            preferredCategories: input.preferredCategories,
            notificationPreferences: input.notificationPreferences ? JSON.stringify(input.notificationPreferences) : (undefined as any),
            emailVerified: input.emailVerified,
            phoneVerified: input.phoneVerified,
          },
        );
      }),
    saveSecurityQuestion: protectedProcedure
      .input(
        z.object({
          securityQuestion: z.string().max(255),
          securityAnswer: z.string().max(255),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        // Hash the answer before storing — never save security answers as plain text
        const hashedAnswer = await bcrypt.hash(input.securityAnswer.trim().toLowerCase(), 10);
        await db.update(userProfiles).set({
          securityQuestion: input.securityQuestion,
          securityAnswer: hashedAnswer,
        }).where(eq(userProfiles.userId, ctx.user.id));
        return { success: true };
      }),
    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string(),
          newPassword: z.string().min(8),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const users_result = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const user = users_result[0];
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        const newHash = await hashPassword(input.newPassword);
        await db.update(users).set({
          passwordHash: newHash,
        }).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
    saveIntegrations: protectedProcedure
      .input(
        z.object({
          connectedAccounts: z.array(z.enum(["ebay", "paypal", "facebook", "linkedin", "whatnot"])),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Store integrations in userProfiles table
        const db = await requireDb();
        await db.update(userProfiles).set({
          connectedAccounts: JSON.stringify(input.connectedAccounts),
        }).where(eq(userProfiles.userId, ctx.user.id));
        return { success: true };
      }),
    saveCommunications: protectedProcedure
      .input(
        z.object({
          tradeInitiated: z.object({ email: z.boolean(), text: z.boolean() }),
          counterProposal: z.object({ email: z.boolean(), text: z.boolean() }),
          proposalAccepted: z.object({ email: z.boolean(), text: z.boolean() }),
          proposalRejected: z.object({ email: z.boolean(), text: z.boolean() }),
          itemsShipped: z.object({ email: z.boolean(), text: z.boolean() }),
          itemsReceived: z.object({ email: z.boolean(), text: z.boolean() }),
          feedbackReceived: z.object({ email: z.boolean(), text: z.boolean() }),
          systemUpdates: z.object({ email: z.boolean(), text: z.boolean() }),
          marketingEmails: z.object({ email: z.boolean(), text: z.boolean() }),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Store communication preferences in userProfiles table
        const db = await requireDb();
        await db.update(userProfiles).set({
          notificationPreferences: JSON.stringify({
            tradeInitiated: input.tradeInitiated,
            counterProposal: input.counterProposal,
            proposalAccepted: input.proposalAccepted,
            proposalRejected: input.proposalRejected,
            itemsShipped: input.itemsShipped,
            itemsReceived: input.itemsReceived,
            feedbackReceived: input.feedbackReceived,
            systemUpdates: input.systemUpdates,
            marketingEmails: input.marketingEmails,
          }),
        }).where(eq(userProfiles.userId, ctx.user.id));
        return { success: true };
      }),
    savePreferences: protectedProcedure
      .input(
        z.object({
          preferredCategories: z.array(z.enum(collectibleCategories)),
          showProfile: z.boolean(),
          hideInventoryValue: z.boolean(),
          receiveContactRequests: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Store preferences in userProfiles table
        const db = await requireDb();
        console.log('[savePreferences] Input:', input);
        console.log('[savePreferences] User ID:', ctx.user.id);
        const result = await db.update(userProfiles).set({
          preferredCategories: JSON.stringify(input.preferredCategories),
          showProfile: input.showProfile ? 1 : 0,
          hideInventoryValue: input.hideInventoryValue ? 1 : 0,
          receiveContactRequests: input.receiveContactRequests ? 1 : 0,
        }).where(eq(userProfiles.userId, ctx.user.id));
        console.log('[savePreferences] Update result:', result);
        return { success: true };
      }),
    createListing: protectedProcedure
      .input(
        z.object({
          title: z.string().min(3).max(160),
          category: z.enum(collectibleCategories),
          itemType: z.string().min(1).max(50),
          condition: z.enum(itemConditions),
          description: z.string().max(4000),
          estimatedValue: z.number().nonnegative().optional(),
          photos: z.array(uploadedImageSchema).max(10),
          itemDetails: z.record(z.string(), z.string()).optional(),
          certificationCompany: z.string().optional(),
          certificationNumber: z.string().optional(),
          grade: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        // Block suspended users from publishing live listings
        if ((ctx.user as any).isSuspended === 1) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account is suspended. Listings cannot be published while suspended.' });
        }
        // Validate grading company and grade from description if present
        const descriptionLines = input.description.split('\n');
        let graderCompany = '';
        let grade = '';
        
        descriptionLines.forEach(line => {
          if (line.startsWith('Grading Company: ')) {
            graderCompany = line.replace('Grading Company: ', '');
          } else if (line.startsWith('Grade: ')) {
            grade = line.replace('Grade: ', '');
          }
        });
        
        if (graderCompany) {
          const company = getGradingCompanyByName(graderCompany);
          if (company && !company.categories.includes(input.category as any)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `${graderCompany} does not grade ${input.category} items.`,
            });
          }
          
          if (company && grade && grade !== "ungraded" && grade !== "raw" && !isValidGradeForCompany(graderCompany, grade)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Grade ${grade} is not valid for ${graderCompany}. Valid grades: ${company.validGrades.join(", ")}.`,
            });
          }
        }
        
        return createListing(
          { id: ctx.user.id, name: ctx.user.name },
          {
            title: input.title,
            category: input.category,
            itemType: input.itemType,
            condition: input.condition,
            description: input.description,
            estimatedValue: input.estimatedValue,
            photos: input.photos,
            itemDetails: input.itemDetails as Record<string, string> | undefined,
            certificationCompany: input.certificationCompany,
            certificationNumber: input.certificationNumber,
            grade: input.grade,
          },
        );
      }),
    updateListing: protectedProcedure
      .input(
        z.object({
          listingId: z.number().int().positive(),
          title: z.string().min(3).max(160),
          category: z.enum(collectibleCategories),
          condition: z.enum(itemConditions),
          description: z.string().max(4000),
          estimatedValue: z.number().nonnegative().optional(),
          photos: z.array(uploadedImageSchema).max(10),
          itemDetails: z.record(z.string(), z.string()).optional(),
          certificationCompany: z.string().optional(),
          certificationNumber: z.string().optional(),
          grade: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        // Validate grading company and grade from description if present
        const descriptionLines = input.description.split('\n');
        let graderCompany = '';
        let grade = '';
        
        descriptionLines.forEach(line => {
          if (line.startsWith('Grading Company: ')) {
            graderCompany = line.replace('Grading Company: ', '');
          } else if (line.startsWith('Grade: ')) {
            grade = line.replace('Grade: ', '');
          }
        });
        
        if (graderCompany) {
          const company = getGradingCompanyByName(graderCompany);
          if (company && !company.categories.includes(input.category as any)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `${graderCompany} does not grade ${input.category} items.`,
            });
          }
          
          if (company && grade && grade !== "ungraded" && grade !== "raw" && !isValidGradeForCompany(graderCompany, grade)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Grade ${grade} is not valid for ${graderCompany}. Valid grades: ${company.validGrades.join(", ")}.`,
            });
          }
        }
        
        return updateListing(
          { id: ctx.user.id, name: ctx.user.name },
          {
            listingId: input.listingId,
            title: input.title,
            category: input.category,
            condition: input.condition,
            description: input.description,
            estimatedValue: input.estimatedValue,
            photos: input.photos,
            itemDetails: input.itemDetails as Record<string, string> | undefined,
            certificationCompany: input.certificationCompany,
            certificationNumber: input.certificationNumber,
            grade: input.grade,
          },
        );
      }),
    createTradeProposal: protectedProcedure
      .input(
        z.object({
          requestedListingId: z.number().int().positive(),
          note: z.string().max(1500).optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        if ((ctx.user as any).isSuspended === 1) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account is suspended. You cannot initiate trades while suspended.' });
        }
        // DEPRECATED: Use tradeFlow.initiateTradeProposal instead
        // Kept for backward compatibility with existing frontend code
        return createTradeProposal(
          { id: ctx.user.id, name: ctx.user.name },
          {
            requestedListingId: input.requestedListingId,
            note: input.note,
          },
        );
      }),
    selectTradeProposalItems: protectedProcedure
      .input(
        z.object({
          proposalId: z.number().int().positive(),
          offeredListingIds: z.array(z.number().int().positive()).min(1).max(5),
          note: z.string().max(1500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await selectTradeProposalItems({ id: ctx.user.id, name: ctx.user.name }, {
          proposalId: input.proposalId,
          selectedListingIds: input.offeredListingIds
        });
        return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
      }),
    respondToTradeProposal: protectedProcedure
      .input(
        z.object({
          proposalId: z.number().int().positive(),
          action: z.enum(["accept", "refuse", "counter", "complete", "cancel"]),
          note: z.string().max(1500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await respondToTradeProposal({ id: ctx.user.id, name: ctx.user.name }, {
          proposalId: input.proposalId,
          response: input.action === "accept" ? "accepted" : "declined"
        });
        return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
      }),
    sendTradeMessage: protectedProcedure
      .input(
        z.object({
          proposalId: z.number().int().positive(),
          message: z.string().min(1).max(1200),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if ((ctx.user as any).isSuspended === 1) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account is suspended. You cannot send messages while suspended.' });
        }
        await sendTradeMessage({ id: ctx.user.id, name: ctx.user.name }, { proposalId: input.proposalId, message: input.message });
        return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
      }),
    toggleWatchlist: protectedProcedure
      .input(
        z.object({
          listingId: z.number().int().positive(),
        }),
      )
      .mutation(({ ctx, input }) => {
        return toggleWatchlist(ctx.user.id, input.listingId); // This one is correct - takes userId and listingId
      }),
    toggleListingStatus: protectedProcedure
      .input(
        z.object({
          listingId: z.number().int().positive(),
          isActive: z.boolean(),
        }),
      )
      .mutation(({ ctx, input }) => {
        return toggleListingStatus({ id: ctx.user.id, name: ctx.user.name }, { listingId: input.listingId, isActive: input.isActive });
      }),
    bulkUpdateListingStatus: protectedProcedure
      .input(
        z.object({
          listingIds: z.array(z.number().int().positive()),
          newStatus: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          await bulkUpdateListingStatus({ id: ctx.user.id, name: ctx.user.name }, { listingIds: input.listingIds, isActive: input.newStatus });
          return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
        } catch (error) {
          console.error('[bulkUpdateListingStatus mutation] Error:', error);
          if (error instanceof Error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: error.message,
            });
          }
          throw error;
        }
      }),
    bulkDeleteListings: protectedProcedure
      .input(
        z.object({
          listingIds: z.array(z.number().int().positive()),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await bulkDeleteListings({ id: ctx.user.id, name: ctx.user.name }, { listingIds: input.listingIds });
        return {
          ...result,
          dashboard: await getDashboardData({ id: ctx.user.id, name: ctx.user.name }),
        };
      }),
    restoreDeletedListings: protectedProcedure
      .input(
        z.object({
          deletedListings: z.array(z.any()),
          deletedPhotos: z.array(z.any()),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await restoreDeletedListings({ id: ctx.user.id, name: ctx.user.name }, { listingIds: input.deletedListings });
        return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
      }),
    adminDeleteListing: protectedProcedure
      .input(
        z.object({
          listingId: z.number().int().positive(),
          deletionReason: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can delete listings' });
        return adminDeleteListing({ id: ctx.user.id, name: ctx.user.name }, input);
      }),
    adminBulkDeleteListings: protectedProcedure
      .input(
        z.object({
          listingIds: z.array(z.number().int().positive()),
          deletionReason: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can delete listings' });
        return adminBulkDeleteListings({ id: ctx.user.id, name: ctx.user.name }, input);
      }),
    leaveTradeReview: protectedProcedure
      .input(
        z.object({
          proposalId: z.number().int().positive(),
          rating: z.number().min(1).max(5),
          review: z.string().max(1500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await leaveTradeReview({ id: ctx.user.id, name: ctx.user.name }, input);
        return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
      }),
    reportUser: protectedProcedure
      .input(reportUserSchema)
      .mutation(async ({ ctx, input }) => {
        const reporterName = ctx.user.name?.trim() || `Collector ${ctx.user.id}`;
        const delivered = await notifyOwner({
          title: `Tradebilia report submitted: ${input.concernType}`,
          content: [
            `Reporter: ${reporterName}`,
            `Reporter user ID: ${ctx.user.id}`,
            `Reporter account email: ${ctx.user.email ?? "Not available"}`,
            `Contact email for follow-up: ${input.contactEmail.trim()}`,
            `Reported member: ${input.reportedMember.trim()}`,
            `Listing or trade reference: ${input.listingReference?.trim() || "Not provided"}`,
            `Concern type: ${input.concernType}`,
            `Details: ${input.details.trim()}`,
            `Evidence notes: ${input.supportingNotes?.trim() || "None provided"}`,
          ].join("\n"),
        });

        return {
          success: delivered,
          message: delivered
            ? "Your report was sent to the Tradebilia moderation review queue."
            : "Your report could not be delivered right now. Please try again shortly.",
        };
      }),
    referralRequest: protectedProcedure
      .input(referralRequestSchema)
      .mutation(async ({ ctx, input }) => {
        const referrerName = ctx.user.name?.trim() || `Collector ${ctx.user.id}`;
        const referrerFirstName = (ctx.user as any)?.firstName || "";
        const referrerLastName = (ctx.user as any)?.lastName || "";
        
        try {
          await createReferralRequest({
            referrerId: ctx.user.id,
            referrerEmail: ctx.user.email ?? "",
            referrerFirstName,
            referrerLastName,
            collectorName: input.friendName.trim(),
            collectorEmail: input.friendEmail.trim(),
            collectorFocus: input.collectorFocus.trim(),
            isMerchant: input.isMerchant,
            message: input.message.trim(),
          });
          return {
            success: true,
            message: "Your referral request has been submitted successfully.",
          };
        } catch (error) {
          console.error('[referralRequest] Failed to save to database:', error);
          return {
            success: false,
            message: "Your referral request could not be saved. Please try again shortly.",
          };
        }
      }),
    saveDraft: protectedProcedure
      .input(
        z.object({
          title: z.string().min(0).max(160).optional().default(""),
          category: z.enum(collectibleCategories),
          grade: z.string().max(10),
          graderCompany: z.string().max(100),
          certificationNumber: z.string().max(100).optional(),
          estimatedValue: z.number().nonnegative().optional(),
          categoryFields: z.record(z.string(), z.string()).optional().default({}),
          additionalNotes: z.string().max(4000).optional(),
          photos: z.array(uploadedImageSchema).optional().default([]),
        }),
      )
      .mutation(({ ctx, input }) => {
        // Validate grading company and grade compatibility
        const company = getGradingCompanyByName(input.graderCompany);
        if (company && !company.categories.includes(input.category as any)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `${input.graderCompany} does not grade ${input.category} items.`,
          });
        }
        
        if (company && input.grade !== "ungraded" && input.grade !== "raw" && !isValidGradeForCompany(input.graderCompany, input.grade)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Grade ${input.grade} is not valid for ${input.graderCompany}. Valid grades: ${company.validGrades.join(", ")}.`,
          });
        }
        
        return saveDraft({ id: ctx.user.id, name: ctx.user.name }, {
          title: input.title,
          category: input.category,
          condition: "poor", // Will be updated when user completes the listing
          description: input.additionalNotes || "",
          grade: input.grade as any,
          graderCompany: input.graderCompany,
          certificationNumber: input.certificationNumber,
          estimatedValue: input.estimatedValue,
          photos: input.photos,
        });
      }),
    getDrafts: protectedProcedure.query(({ ctx }) => {
      return getDrafts({ id: ctx.user.id, name: ctx.user.name });
    }),
    getDraftById: protectedProcedure
      .input(z.object({ draftId: z.number().int().positive() }))
      .query(({ ctx, input }) => {
        return getDraftById({ id: ctx.user.id, name: ctx.user.name }, input.draftId);
      }),
    updateDraft: protectedProcedure
      .input(
        z.object({
          draftId: z.number().int().positive(),
          title: z.string().min(1).max(160),
          category: z.enum(collectibleCategories),
          condition: z.enum(itemConditions),
          description: z.string(),
          grade: z.number().optional(),
          graderCompany: z.string().optional(),
          certificationNumber: z.string().optional(),
          estimatedValue: z.number().optional(),
          photos: z.array(z.object({ name: z.string(), type: z.string(), contentBase64: z.string() })),
        }),
      )
      .mutation(({ ctx, input }) => {
        return updateDraft({ id: ctx.user.id, name: ctx.user.name }, {
          draftId: input.draftId,
          title: input.title,
          category: input.category,
          grade: input.grade,
          graderCompany: input.graderCompany,
          certificationNumber: input.certificationNumber,
          estimatedValue: input.estimatedValue,
          categoryFields: {},
          additionalNotes: input.description,
          photos: input.photos,
        });
      }),
    deleteDraft: protectedProcedure
      .input(
        z.object({
          draftId: z.number().int().positive(),
        }),
      )
      .mutation(({ ctx, input }) => {
        return deleteDraft({ id: ctx.user.id, name: ctx.user.name }, { draftId: input.draftId });
      }),
    createForumPost: protectedProcedure
      .input(
        z.object({
          category: z.string().min(1).max(64),
          title: z.string().min(3).max(255),
          content: z.string().min(10).max(5000),
        }),
      )
      .mutation(({ ctx, input }) => {
        return createForumPost({ id: ctx.user.id, name: ctx.user.name }, input);
      }),
    getForumPosts: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          sortBy: z.enum(["newest", "popular", "replies"]).default("newest"),
        }),
      )
      .query(({ input }) => {
        return getForumPosts(input.category, input.sortBy);
      }),
    getForumPostDetail: publicProcedure
      .input(z.object({ postId: z.number().int().positive() }))
      .query(({ input }) => {
        return getForumPostById(input.postId);
      }),
    getForumReplies: publicProcedure
      .input(z.object({ postId: z.number().int().positive() }))
      .query(({ input }) => {
        return getForumReplies(input.postId);
      }),
    addForumReply: protectedProcedure
      .input(
        z.object({
          postId: z.number().int().positive(),
          content: z.string().min(1).max(2000),
        }),
      )
      .mutation(({ ctx, input }) => {
        return addForumReply({ id: ctx.user.id, name: ctx.user.name }, input);
      }),
    lookupUserByUsername: publicProcedure
      .input(z.object({ username: z.string().min(1).max(64) }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [found] = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.username, input.username)).limit(1);
        if (!found) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        return { userId: found.id, username: found.username };
      }),

    submitReport: protectedProcedure
      .input(
        z.object({
          reportedUserId: z.number().int().positive(),
          reason: z.string().min(1).max(100),
          description: z.string().min(10).max(2000),
          evidence: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.reportedUserId === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot report yourself' });
        }
        return submitUserReport({
          reportedUserId: input.reportedUserId,
          reporterUserId: ctx.user.id,
          reason: input.reason,
          description: input.description,
          evidence: input.evidence,
        });
      }),
    sendInquiry: protectedProcedure
      .input(
        z.object({
          listingId: z.number().int().positive(),
          recipientId: z.number().int().positive(),
          subject: z.string().min(1).max(255),
          message: z.string().min(1).max(5000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await sendItemInquiry({ id: ctx.user.id, name: ctx.user.name }, input);

        // Send email notification to recipient if messages.email enabled (fire-and-forget)
        const db = await requireDb();
        const recipientUser = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, input.recipientId))
          .limit(1);
        if (recipientUser[0]?.email) {
          const recipientProfile = await db
            .select({ notificationPreferences: userProfiles.notificationPreferences })
            .from(userProfiles)
            .where(eq(userProfiles.userId, input.recipientId))
            .limit(1);
          let messagesEmailEnabled = true;
          try {
            const prefs = JSON.parse(recipientProfile[0]?.notificationPreferences ?? '{}');
            if (prefs?.messages?.email === false) messagesEmailEnabled = false;
          } catch {}
          if (messagesEmailEnabled) {
            sendNewDirectMessageEmail({
              recipientEmail: recipientUser[0].email,
              recipientName: recipientUser[0].name ?? `Collector ${input.recipientId}`,
              senderName: ctx.user.name ?? 'A Tradebilia member',
              subject: input.subject,
              bodyPreview: input.message,
            }).catch(err => console.warn('[Email] Failed to send inquiry notification:', err));
          }
        }

        return result;
      }),
    getUnreadInquiries: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadInquiries(ctx.user.id);
    }),
    getInquiries: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().positive().default(50),
          offset: z.number().int().nonnegative().default(0),
        }),
      )
      .output(
        z.array(
          z.object({
            id: z.number(),
            senderId: z.number(),
            senderName: z.string().nullable(),
            senderAvatarUrl: z.string().nullable(),
            recipientId: z.number(),
            recipientName: z.string().nullable(),
            recipientAvatarUrl: z.string().nullable(),
            listingId: z.number(),
            subject: z.string(),
            message: z.string(),
            isRead: z.number(),
            createdAt: z.string(),
            updatedAt: z.string(),
            deletedAt: z.string().nullable(),
          })
        )
      )
      .query(async ({ ctx, input }) => {
        return getInquiriesByUser(ctx.user.id, input.limit, input.offset);
      }),
    markInquiryAsRead: protectedProcedure
      .input(z.object({ inquiryId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return markInquiryAsRead(input.inquiryId, ctx.user.id);
      }),
    sendReply: protectedProcedure
      .input(z.object({ inquiryId: z.number().int().positive(), message: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        return sendInquiryReply(input.inquiryId, ctx.user.id, input.message);
      }),
    getReplies: protectedProcedure
      .input(z.object({ inquiryId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getRepliesByInquiry(input.inquiryId);
      }),
    deleteInquiry: protectedProcedure
      .input(z.object({ inquiryId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await deleteInquiry(input.inquiryId, ctx.user.id);
        return { success: true };
      }),
    getDeleted: protectedProcedure
      .query(async ({ ctx }) => {
        return getDeletedInquiries(ctx.user.id);
      }),
    emptyDeleted: protectedProcedure
      .mutation(async ({ ctx }) => {
        await emptyDeletedInquiries(ctx.user.id);
                return { success: true };
      }),

    // ── User Follow / Save Trader ──────────────────────────────────────────
    toggleFollowUser: protectedProcedure
      .input(z.object({ followingId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        if (ctx.user.id === input.followingId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot follow yourself.' });
        }
        const existing = await db
          .select({ id: userFollows.id })
          .from(userFollows)
          .where(and(eq(userFollows.followerId, ctx.user.id), eq(userFollows.followingId, input.followingId)))
          .limit(1);
        if (existing.length > 0) {
          await db.delete(userFollows).where(eq(userFollows.id, existing[0].id));
          return { following: false };
        } else {
          await db.insert(userFollows).values({ followerId: ctx.user.id, followingId: input.followingId });
          return { following: true };
        }
      }),

    isFollowingUser: publicProcedure
      .input(z.object({ followingId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user?.id) return { following: false };
        const db = await requireDb();
        const existing = await db
          .select({ id: userFollows.id })
          .from(userFollows)
          .where(and(eq(userFollows.followerId, ctx.user.id), eq(userFollows.followingId, input.followingId)))
          .limit(1);
        return { following: existing.length > 0 };
      }),

    getFollowedUsers: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await requireDb();
        const [rows] = await db.execute(
          sql`SELECT 
            uf.id as followId,
            uf.createdAt as followedAt,
            u.id as userId,
            up.displayName,
            up.avatarUrl,
            up.contactTown,
            up.contactState,
            u.createdAt as memberSince,
            (SELECT COUNT(*) FROM listings l WHERE l.ownerId = u.id AND l.status = 'active' AND l.isActive = 1) as itemsListed,
            (SELECT COUNT(*) FROM tradeProposals tp WHERE (tp.requesterId = u.id OR tp.recipientId = u.id) AND tp.status = 'completed') as completedTrades,
            (SELECT ROUND(AVG(tr.overallRating), 1) FROM tradeReviews tr WHERE tr.revieweeId = u.id AND tr.isVisible = 1) as avgRating,
            (SELECT COUNT(*) FROM tradeReviews tr WHERE tr.revieweeId = u.id AND tr.isVisible = 1) as reviewCount
          FROM userFollows uf
          JOIN users u ON u.id = uf.followingId
          LEFT JOIN userProfiles up ON up.userId = u.id
          WHERE uf.followerId = ${ctx.user.id}
          ORDER BY uf.createdAt DESC`
        );
        return Array.isArray(rows) ? rows : [];
      }),

    // ── Direct Messages (DB-backed) ──────────────────────────────────────────
    sendDirectMessage: protectedProcedure
      .input(z.object({
        recipientId: z.number().int().positive(),
        subject: z.string().min(1).max(255),
        body: z.string().min(1).max(5000),
        itemId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        if (ctx.user.id === input.recipientId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot message yourself.' });
        }
        // Find or create thread (participants stored in sorted order, unique per item)
        const pA = Math.min(ctx.user.id, input.recipientId);
        const pB = Math.max(ctx.user.id, input.recipientId);
        const itemId = input.itemId || null;
        const existing = await db
          .select({ id: directMessageThreads.id })
          .from(directMessageThreads)
          .where(and(
            eq(directMessageThreads.participantAId, pA),
            eq(directMessageThreads.participantBId, pB),
            itemId ? eq(directMessageThreads.itemId, itemId) : sql`${directMessageThreads.itemId} IS NULL`
          ))
          .limit(1);
        let threadId: number;
        let isNewThread = false;
        if (existing.length > 0) {
          threadId = existing[0].id;
          await db.execute(sql`UPDATE directMessageThreads SET lastMessageAt = NOW() WHERE id = ${threadId}`);
        } else {
          isNewThread = true;
          const result = await db.insert(directMessageThreads).values({ participantAId: pA, participantBId: pB, itemId });
          threadId = (result as any)[0]?.insertId ?? (result as any).insertId;
        }
        await db.insert(directMessages).values({
          threadId,
          senderId: ctx.user.id,
          subject: input.subject,
          body: input.body,
          isReadByRecipient: 0,
        });

        // Send email notification to recipient if they have messages.email enabled (fire-and-forget)
        console.log('[sendDirectMessage] Sending email - senderId:', ctx.user.id, 'recipientId:', input.recipientId);
        const recipientUser = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, input.recipientId))
          .limit(1);
        console.log('[sendDirectMessage] Recipient email:', recipientUser[0]?.email, 'Recipient name:', recipientUser[0]?.name);
        if (recipientUser[0]?.email) {
          // Check notification preference
          const recipientProfile = await db
            .select({ notificationPreferences: userProfiles.notificationPreferences })
            .from(userProfiles)
            .where(eq(userProfiles.userId, input.recipientId))
            .limit(1);
          let messagesEmailEnabled = true; // default on
          try {
            const prefs = JSON.parse(recipientProfile[0]?.notificationPreferences ?? '{}');
            if (prefs?.messages?.email === false) messagesEmailEnabled = false;
          } catch {}
          if (messagesEmailEnabled) {
            sendNewDirectMessageEmail({
              recipientEmail: recipientUser[0].email,
              recipientName: recipientUser[0].name ?? `Collector ${input.recipientId}`,
              senderName: ctx.user.name ?? 'A Tradebilia member',
              subject: input.subject,
              bodyPreview: input.body,
            }).catch(err => console.warn('[Email] Failed to send new message notification:', err));
          }
        }

        return { threadId, recipientId: input.recipientId };
      }),

    getDirectMessageThreads: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await requireDb();
        const [rows] = await db.execute(
          sql`SELECT
            t.id as threadId,
            t.lastMessageAt,
            -- counterpart info
            CASE WHEN t.participantAId = ${ctx.user.id} THEN t.participantBId ELSE t.participantAId END as counterpartId,
            up.displayName as counterpartName,
            up.avatarUrl as counterpartAvatarUrl,
            -- latest message
            (SELECT dm2.body FROM directMessages dm2 WHERE dm2.threadId = t.id ORDER BY dm2.createdAt DESC LIMIT 1) as latestBody,
            (SELECT dm2.subject FROM directMessages dm2 WHERE dm2.threadId = t.id ORDER BY dm2.createdAt DESC LIMIT 1) as latestSubject,
            (SELECT dm2.senderId FROM directMessages dm2 WHERE dm2.threadId = t.id ORDER BY dm2.createdAt DESC LIMIT 1) as latestSenderId,
            -- unread count for current user
            (SELECT COUNT(*) FROM directMessages dm3 WHERE dm3.threadId = t.id AND dm3.senderId != ${ctx.user.id} AND dm3.isReadByRecipient = 0) as unreadCount
          FROM directMessageThreads t
          JOIN users u ON u.id = CASE WHEN t.participantAId = ${ctx.user.id} THEN t.participantBId ELSE t.participantAId END
          LEFT JOIN userProfiles up ON up.userId = u.id
          WHERE t.participantAId = ${ctx.user.id} OR t.participantBId = ${ctx.user.id}
          ORDER BY t.lastMessageAt DESC`
        );
        return Array.isArray(rows) ? rows : [];
      }),

    getDirectMessages: protectedProcedure
      .input(z.object({ threadId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await requireDb();
        // Verify user is a participant
        const thread = await db
          .select({ id: directMessageThreads.id })
          .from(directMessageThreads)
          .where(and(
            eq(directMessageThreads.id, input.threadId),
            or(eq(directMessageThreads.participantAId, ctx.user.id), eq(directMessageThreads.participantBId, ctx.user.id))
          ))
          .limit(1);
        if (!thread.length) throw new TRPCError({ code: 'FORBIDDEN', message: 'Thread not found.' });
        const msgs = await db
          .select()
          .from(directMessages)
          .where(eq(directMessages.threadId, input.threadId))
          .orderBy(directMessages.createdAt);
        // Mark all messages from counterpart as read
        await db.execute(
          sql`UPDATE directMessages SET isReadByRecipient = 1 WHERE threadId = ${input.threadId} AND senderId != ${ctx.user.id} AND isReadByRecipient = 0`
        );
        return msgs;
      }),

    replyDirectMessage: protectedProcedure
      .input(z.object({ threadId: z.number().int().positive(), body: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const thread = await db
          .select()
          .from(directMessageThreads)
          .where(and(
            eq(directMessageThreads.id, input.threadId),
            or(eq(directMessageThreads.participantAId, ctx.user.id), eq(directMessageThreads.participantBId, ctx.user.id))
          ))
          .limit(1);
        if (!thread.length) throw new TRPCError({ code: 'FORBIDDEN', message: 'Thread not found.' });
        await db.insert(directMessages).values({ threadId: input.threadId, senderId: ctx.user.id, body: input.body, isReadByRecipient: 0 });
        await db.execute(sql`UPDATE directMessageThreads SET lastMessageAt = NOW() WHERE id = ${input.threadId}`);

        // Send email notification to the other participant if messages.email enabled (fire-and-forget)
        const recipientId = thread[0].participantAId === ctx.user.id
          ? thread[0].participantBId
          : thread[0].participantAId;
        const recipientUser = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, recipientId))
          .limit(1);
        if (recipientUser[0]?.email) {
          const recipientProfile = await db
            .select({ notificationPreferences: userProfiles.notificationPreferences })
            .from(userProfiles)
            .where(eq(userProfiles.userId, recipientId))
            .limit(1);
          let messagesEmailEnabled = true;
          try {
            const prefs = JSON.parse(recipientProfile[0]?.notificationPreferences ?? '{}');
            if (prefs?.messages?.email === false) messagesEmailEnabled = false;
          } catch {}
          if (messagesEmailEnabled) {
            sendDirectMessageReplyEmail({
              recipientEmail: recipientUser[0].email,
              recipientName: recipientUser[0].name ?? `Collector ${recipientId}`,
              senderName: ctx.user.name ?? 'A Tradebilia member',
              bodyPreview: input.body,
            }).catch(err => console.warn('[Email] Failed to send reply notification:', err));
          }
        }

        return { success: true };
      }),

    deleteDirectThread: protectedProcedure
      .input(z.object({ threadId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        // Verify user is a participant before deleting
        const thread = await db
          .select({ id: directMessageThreads.id })
          .from(directMessageThreads)
          .where(and(
            eq(directMessageThreads.id, input.threadId),
            or(eq(directMessageThreads.participantAId, ctx.user.id), eq(directMessageThreads.participantBId, ctx.user.id))
          ))
          .limit(1);
        if (!thread.length) throw new TRPCError({ code: 'FORBIDDEN', message: 'Thread not found.' });
        // Cascade delete removes all messages too (FK ON DELETE CASCADE)
        await db.delete(directMessageThreads).where(eq(directMessageThreads.id, input.threadId));
        return { success: true };
      }),

    getUnreadDirectMessageCount: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await requireDb();
        const [rows] = await db.execute(
          sql`SELECT COUNT(*) as count FROM directMessages dm
          JOIN directMessageThreads t ON t.id = dm.threadId
          WHERE (t.participantAId = ${ctx.user.id} OR t.participantBId = ${ctx.user.id})
          AND dm.senderId != ${ctx.user.id}
          AND dm.isReadByRecipient = 0`
        );
        const count = Array.isArray(rows) ? Number((rows[0] as any)?.count ?? 0) : 0;
        return { count };
      }),

    getUserTrades: publicProcedure
      .input(z.object({ userId: z.number().int().positive(), limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [rows] = await db.execute(
          sql`SELECT
            tp.id as tradeId,
            tp.referenceNumber,
            tp.completedAt,
            tp.requesterId,
            tp.recipientId,
            -- Requester info
            req_u.username as requesterUsername,
            req_up.displayName as requesterDisplayName,
            req_up.avatarUrl as requesterAvatar,
            -- Recipient info
            rec_u.username as recipientUsername,
            rec_up.displayName as recipientDisplayName,
            rec_up.avatarUrl as recipientAvatar,
            -- Requester item (what they offered)
            req_item.id as requesterItemId,
            req_item.title as requesterItemTitle,
            req_item.category as requesterItemCategory,
            (SELECT lp.imageUrl FROM listingPhotos lp WHERE lp.listingId = req_item.id ORDER BY lp.sortOrder ASC LIMIT 1) as requesterItemPhoto,
            -- Recipient item (what was requested)
            rec_item.id as recipientItemId,
            rec_item.title as recipientItemTitle,
            rec_item.category as recipientItemCategory,
            (SELECT lp.imageUrl FROM listingPhotos lp WHERE lp.listingId = rec_item.id ORDER BY lp.sortOrder ASC LIMIT 1) as recipientItemPhoto
          FROM tradeProposals tp
          LEFT JOIN users req_u ON req_u.id = tp.requesterId
          LEFT JOIN userProfiles req_up ON req_up.userId = tp.requesterId
          LEFT JOIN users rec_u ON rec_u.id = tp.recipientId
          LEFT JOIN userProfiles rec_up ON rec_up.userId = tp.recipientId
          LEFT JOIN tradeProposalItems tpi ON tpi.proposalId = tp.id
          LEFT JOIN listings req_item ON req_item.id = tpi.offeredListingId
          LEFT JOIN listings rec_item ON rec_item.id = tp.requestedListingId
          WHERE tp.status = 'completed'
            AND tp.completedAt IS NOT NULL
            AND (tp.requesterId = ${input.userId} OR tp.recipientId = ${input.userId})
          ORDER BY tp.completedAt DESC
          LIMIT ${input.limit}`
        );
        return Array.isArray(rows) ? rows : [];
      }),
    getRecentTrades: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).default(8) }).optional())
      .query(async ({ input }) => {
        const db = await requireDb();
        const limit = input?.limit ?? 8;

        // Fetch the most recent completed trades with both sides' item info
        const [rows] = await db.execute(
          sql`SELECT
            tp.id as tradeId,
            tp.referenceNumber,
            tp.completedAt,
            -- Requester side: the item they offered (from tradeProposalItems)
            req_item.id as requesterItemId,
            req_item.title as requesterItemTitle,
            req_item.category as requesterItemCategory,
            (SELECT lp.imageUrl FROM listingPhotos lp WHERE lp.listingId = req_item.id ORDER BY lp.sortOrder ASC LIMIT 1) as requesterItemPhoto,
            -- Recipient side: the item that was requested
            rec_item.id as recipientItemId,
            rec_item.title as recipientItemTitle,
            rec_item.category as recipientItemCategory,
            (SELECT lp.imageUrl FROM listingPhotos lp WHERE lp.listingId = rec_item.id ORDER BY lp.sortOrder ASC LIMIT 1) as recipientItemPhoto
          FROM tradeProposals tp
          -- Get the item the requester offered
          LEFT JOIN tradeProposalItems tpi ON tpi.proposalId = tp.id
          LEFT JOIN listings req_item ON req_item.id = tpi.offeredListingId
          -- Get the item the recipient put up (the requestedListing)
          LEFT JOIN listings rec_item ON rec_item.id = tp.requestedListingId
          WHERE tp.status = 'completed'
            AND tp.completedAt IS NOT NULL
            AND req_item.id IS NOT NULL
          ORDER BY tp.completedAt DESC
          LIMIT ${limit}`
        );
        return Array.isArray(rows) ? rows : [];
      }),

    getMyWarnings: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await requireDb();
        const [rows] = await db.execute(
          sql`SELECT uw.id, uw.message, uw.createdAt
              FROM userWarnings uw
              WHERE uw.userId = ${ctx.user.id}
              ORDER BY uw.createdAt DESC
              LIMIT 10`
        );
        return Array.isArray(rows) ? rows : [];
      }),
  }),
  ebay: router({
    getAuthUrl: protectedProcedure
      .input(z.object({ state: z.string() }))
      .query(({ input }) => {
        return getEbayAuthUrl(input.state);
      }),

    connectAccount: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const tokenData = await exchangeCodeForToken(input.code);
          const userInfo = await getUserInfo(tokenData.access_token);
          const feedback = await getUserFeedback(tokenData.access_token, userInfo.userId);
          const isLowFeedback = userInfo.feedbackPercentage < 95;

          await updateUserEbayInfo({
            userId: ctx.user.id,
            ebayUsername: userInfo.username,
            ebayUserId: userInfo.userId,
            ebayFeedbackScore: userInfo.feedbackScore,
            ebayFeedbackPercentage: userInfo.feedbackPercentage,
            ebayMemberSince: userInfo.memberSince,
            ebaySellerLevel: userInfo.sellerLevel,
            ebayIdVerified: userInfo.idVerified,
            ebayStar: userInfo.star,
            ebayPositive12mo: userInfo.positive12mo,
            ebayNeutral12mo: userInfo.neutral12mo,
            ebayNegative12mo: userInfo.negative12mo,
            ebayIsStoreOwner: userInfo.isStoreOwner,
            ebayAccessToken: tokenData.access_token,
            ebayRefreshToken: tokenData.refresh_token,
            ebayTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          });

          for (const fb of feedback) {
            await storeEbayFeedback({
              userId: ctx.user.id,
              ...fb,
            });
          }

          if (isLowFeedback) {
            await flagLowFeedback({
              userId: ctx.user.id,
              feedbackScore: userInfo.feedbackScore,
              feedbackPercentage: userInfo.feedbackPercentage,
              flaggedReason: `Low eBay feedback: ${userInfo.feedbackPercentage}%`,
            });
          }

          return {
            success: true,
            username: userInfo.username,
            feedbackScore: userInfo.feedbackScore,
            feedbackPercentage: userInfo.feedbackPercentage,
          };
        } catch (error) {
          console.error('eBay connection error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to connect eBay account',
          });
        }
      }),

    getInfo: protectedProcedure.query(async ({ ctx }) => {
      return await getUserEbayInfo(ctx.user.id);
    }),

    getFeedback: protectedProcedure.query(async ({ ctx }) => {
      return await getUserEbayFeedback(ctx.user.id);
    }),
    getPublicFeedback: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getUserEbayFeedback(input.userId);
      }),

    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      await db
        .update(users)
        .set({
          ebayUsername: null,
          ebayUserId: null,
          ebayFeedbackScore: null,
          ebayFeedbackPercentage: null,
          ebayMemberSince: null,
          ebayConnectedAt: null,
          ebayAccessToken: null,
          ebayRefreshToken: null,
          ebayTokenExpiresAt: null,
        })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
  }),

  // ─── Facebook Router ────────────────────────────────────────────────
  facebook: router({
    // Returns the Facebook OAuth login URL for the frontend to redirect to
    getAuthUrl: protectedProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        const { getFacebookAuthUrl } = await import('./_core/facebook');
        return getFacebookAuthUrl(input.state) as string;
      }),

    // Returns the current user's connected Facebook info
    getInfo: protectedProcedure.query(async ({ ctx }) => {
      return await getUserFacebookInfo(ctx.user.id);
    }),

    // Disconnects the user's Facebook account
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      await db
        .update(users)
        .set({
          facebookId: null,
          facebookName: null,
          facebookVerified: 0,
          facebookConnectedAt: null,
          facebookAccessToken: null,
          facebookEmail: null,
          facebookPicture: null,
          facebookLocation: null,
          facebookLink: null,
          facebookLikes: null,
        })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
  }),

  linkedin: router({
    // Returns the LinkedIn OAuth login URL for the frontend to redirect to
    getAuthUrl: protectedProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        const { getLinkedInAuthUrl } = await import('./_core/linkedin');
        return getLinkedInAuthUrl(input.state) as string;
      }),
    // Returns the current user's connected LinkedIn info
    getInfo: protectedProcedure.query(async ({ ctx }) => {
      return await getUserLinkedInInfo(ctx.user.id);
    }),
    // Disconnects the user's LinkedIn account
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      await db
        .update(users)
        .set({
          linkedinId: null,
          linkedinName: null,
          linkedinEmail: null,
          linkedinPicture: null,
          linkedinHeadline: null,
          linkedinProfileUrl: null,
          linkedinAccessToken: null,
          linkedinConnectedAt: null,
        })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
  }),
  admin: router({
    // Platform statistics
    getPlatformStatistics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      
      // Get total members
      const memberCount = await db.select({ count: sql`count(*)` }).from(users);
      
      // Get total listings
      const listingCount = await db.select({ count: sql`count(*)` }).from(listings);
      
      // Get total trades
      const tradeCount = await db.select({ count: sql`count(*)` }).from(tradeProposals);
      
      // Get total value (sum of estimated values)
      const totalValue = await db.select({ total: sql`sum(${listings.estimatedValue})` }).from(listings);
      
      return {
        totalMembers: Number(memberCount[0]?.count || 0),
        totalListings: Number(listingCount[0]?.count || 0),
        totalTrades: Number(tradeCount[0]?.count || 0),
        totalValue: Number(totalValue[0]?.total || 0),
      };
    }),
    // User management
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      
      // Get all users with their profile info
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        displayName: userProfiles.displayName,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastActivityAt: users.lastActivityAt,
        isSuspended: users.isSuspended,
        suspendedAt: users.suspendedAt,
        isBanned: users.isBanned,
        bannedAt: users.bannedAt,
        banReason: users.banReason,
        warnCount: users.warnCount,
        lastWarnedAt: users.lastWarnedAt,
        contactFullName: userProfiles.contactFullName,
        contactEmail: userProfiles.contactEmail,
        contactPhone: userProfiles.contactPhone,
        contactAddress: userProfiles.contactAddress,
        contactTown: userProfiles.contactTown,
        contactState: userProfiles.contactState,
        contactZipCode: userProfiles.contactZipCode,
        contactCountry: userProfiles.contactCountry,
      }).from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId)) as Array<{
        id: number;
        username: string | null;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        role: "user" | "admin";
        // Schema timestamps are string-mode
        createdAt: string;
        lastActivityAt: string;
        isSuspended: number;
        suspendedAt: string | null;
        contactFullName: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        contactAddress: string | null;
        contactTown: string | null;
        contactState: string | null;
        contactZipCode: string | null;
        contactCountry: string | null;
      }>;
      
      // Get active listings count for each user
      const listingCounts = await db.select({
        userId: listings.ownerId,
        count: sql<number>`COUNT(*)`
      }).from(listings)
        .where(eq(listings.status, 'active'))
        .groupBy(listings.ownerId);
      
      // Create a map for quick lookup
      const countMap = new Map(listingCounts.map(lc => [lc.userId, lc.count]));
      
      // Add items count and online status to each user
      const ONLINE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      
      return allUsers.map(user => ({
        ...user,
        itemsListed: countMap.get(user.id) || 0,
        isOnline: (now - new Date(user.lastActivityAt).getTime()) < ONLINE_TIMEOUT,
      }));
      
    }),
    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        console.log(`[deleteUser] Starting deletion for userId: ${input.userId}`);
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete yourself' });
        const db = await requireDb();
        
        // Get user info before deletion
        const userToDelete = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        const userProfile = await db.select().from(userProfiles).where(eq(userProfiles.userId, input.userId)).limit(1);
        
        if (!userToDelete.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

        // Q23: Block deletion if user has active trades
        const [activeTrades] = await db.execute(
          sql`SELECT COUNT(*) as cnt FROM tradeProposals WHERE (requesterId = ${input.userId} OR recipientId = ${input.userId}) AND status IN ('pending', 'negotiating', 'accepted', 'shipped')`
        );
        if ((activeTrades as any)?.[0]?.cnt > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete account: user has active trades. Please resolve all active trades first.' });
        }
        
        const user = userToDelete[0];
        const profile = userProfile[0];
        console.log(`[deleteUser] Found user: ${user.username}, profile exists: ${!!profile}`);
        
        // Delete all dependent records in the correct order (respecting foreign key constraints)
        
        // Delete trade messages where user is the sender
        console.log(`[deleteUser] Deleting trade messages...`);
        await db.delete(tradeMessages).where(eq(tradeMessages.senderId, input.userId));
        
        // Delete trade reviews where user is the reviewer or reviewee
        console.log(`[deleteUser] Deleting trade reviews...`);
        await db.delete(tradeReviews).where(or(
          eq(tradeReviews.reviewerId, input.userId),
          eq(tradeReviews.revieweeId, input.userId)
        ));
        
        // Delete trade proposals where user is the requester or recipient
        console.log(`[deleteUser] Deleting trade proposals...`);
        await db.delete(tradeProposals).where(or(
          eq(tradeProposals.requesterId, input.userId),
          eq(tradeProposals.recipientId, input.userId)
        ));
        
        // Delete watchlist entries
        console.log(`[deleteUser] Deleting watchlist entries...`);
        await db.delete(watchlistEntries).where(eq(watchlistEntries.userId, input.userId));
        
        // Delete draft listings
        console.log(`[deleteUser] Deleting draft listings...`);
        await db.delete(draftListings).where(eq(draftListings.userId, input.userId));
        
        // Delete password reset tokens (has cascade delete but we'll delete explicitly)
        console.log(`[deleteUser] Deleting password reset tokens...`);
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, input.userId));
        
        // Delete all listings owned by the user
        console.log(`[deleteUser] Deleting listings...`);
        const listingsDeleted = await db.delete(listings).where(eq(listings.ownerId, input.userId));
        console.log(`[deleteUser] Deleted listings, result:`, listingsDeleted);
        
        // Log the deletion
        console.log(`[deleteUser] Inserting into deletedAccounts...`);
        try {
          await db.insert(deletedAccounts).values({
            userId: input.userId,
            username: user.username || `user_${input.userId}`,
            email: user.email || null,
            displayName: profile?.displayName || user.displayName || null,
            firstName: profile?.firstName || null,
            lastName: profile?.lastName || null,
            deletedBy: ctx.user.id,
            reason: 'Admin deletion',
          } as any);
        } catch (err) {
          console.log(`[deleteUser] Error inserting into deletedAccounts:`, err);
          throw err;
        }
        
        // Delete user profile
        console.log(`[deleteUser] Deleting profile...`);
        const profileDeleted = await db.delete(userProfiles).where(eq(userProfiles.userId, input.userId));
        console.log(`[deleteUser] Deleted profile, result:`, profileDeleted);
        
        // Delete user
        console.log(`[deleteUser] Deleting user...`);
        const deleteResult = await db.delete(users).where(eq(users.id, input.userId));
        console.log(`[deleteUser] Deleted user ${input.userId}, result:`, deleteResult);
        
        return { success: true };
      }),
    updateUserRole: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(['user', 'admin']) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    updateUser: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        displayName: z.string().max(100).optional(),
        contactFullName: z.string().max(200).optional(),
        contactPhone: z.string().max(20).optional(),
        contactEmail: z.string().email().optional(),
        contactAddress: z.string().max(255).optional(),
        contactTown: z.string().max(100).optional(),
        contactState: z.string().max(100).optional(),
        contactZipCode: z.string().max(20).optional(),
        contactCountry: z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const { userId, ...updateData } = input;
        
        // All editable fields belong to userProfiles table
        const userProfilesTableFields: any = {};
        
        // Map all fields to userProfiles table
        const profileFields = ['firstName', 'lastName', 'displayName', 'contactFullName', 'contactPhone', 'contactEmail', 'contactAddress', 'contactTown', 'contactState', 'contactZipCode', 'contactCountry'];
        profileFields.forEach(field => {
          const value = updateData[field as keyof typeof updateData];
          if (value !== undefined && value !== null && value !== '') {
            userProfilesTableFields[field] = value;
          }
        });
        
        // Update userProfiles table if there are fields to update
        if (Object.keys(userProfilesTableFields).length > 0) {
          await db.update(userProfiles).set(userProfilesTableFields).where(eq(userProfiles.userId, userId));
        }
        
        return { success: true };
      }),
    // Deleted accounts management
    getDeletedAccounts: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const deleted = await db.select().from(deletedAccounts).orderBy((t) => t.deletedAt);
      return deleted;
    }),
    // Listings management
    getAllListings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const allListings = await db.select({
        id: listings.id,
        title: listings.title,
        category: listings.category,
        status: listings.status,
        createdAt: listings.createdAt,
        viewCount: listings.viewCount,
        estimatedValue: listings.estimatedValue,
        ownerId: listings.ownerId,
        ownerProfile: {
          displayName: userProfiles.displayName,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
        },
      }).from(listings)
        .leftJoin(userProfiles, eq(listings.ownerId, userProfiles.userId))
        .orderBy(desc(listings.createdAt));
      return allListings;
    }),
    getAllTrades: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const allTrades = await db.select({
        id: tradeProposals.id,
        requesterId: tradeProposals.requesterId,
        requesterUsername: users.username,
        recipientId: tradeProposals.recipientId,
        requestedListingId: tradeProposals.requestedListingId,
        listingTitle: listings.title,
        listingCategory: listings.category,
        status: tradeProposals.status,
        createdAt: tradeProposals.createdAt,
        respondedAt: tradeProposals.respondedAt,
        completedAt: tradeProposals.completedAt,
      }).from(tradeProposals)
        .leftJoin(users, eq(tradeProposals.requesterId, users.id))
        .leftJoin(listings, eq(tradeProposals.requestedListingId, listings.id))
        .orderBy(desc(tradeProposals.createdAt));
      return allTrades;
    }),
    // Reported users management
    getReportedUsers: protectedProcedure
      .input(
        z.object({
          status: z.enum(['pending', 'reviewed', 'dismissed', 'action_taken']).optional(),
          limit: z.number().int().positive().default(50),
          offset: z.number().int().nonnegative().default(0),
        }),
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return getUserReports({
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        });
      }),
    getReportDetails: protectedProcedure
      .input(z.object({ reportId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return getUserReportDetails(input.reportId);
      }),
    updateReportStatus: protectedProcedure
      .input(
        z.object({
          reportId: z.string(),
          status: z.enum(['pending', 'reviewed', 'dismissed', 'action_taken']),
          adminNotes: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await updateReportStatus({
          reportId: input.reportId,
          status: input.status,
          adminNotes: input.adminNotes,
          reviewedBy: ctx.user.id,
        });
        return { success: true };
      }),
    // Referral management
    getAllReferrals: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await getAllReferralRequests();
    }),
    updateReferralStatus: protectedProcedure
      .input(z.object({
        referralId: z.number(),
        status: z.enum(['pending', 'reviewed', 'approved', 'rejected']),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await updateReferralRequestStatus(input.referralId, input.status, input.adminNotes, ctx.user.id);
        return { success: true };
      }),
    sendBulkEmailToReferrals: protectedProcedure
      .input(z.object({ referralIds: z.array(z.number()), subject: z.string().min(1), message: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const referrals = await getReferralsByIds(input.referralIds);
        if (referrals.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });
        // Filter out already-emailed referrals
        const unEmailedReferrals = referrals.filter((r: any) => !r.emailSent);
        if (unEmailedReferrals.length === 0) {
          return { success: true, emailsSent: 0, skipped: referrals.length };
        }
        // Send emails one by one
        let sent = 0;
        for (const referral of unEmailedReferrals) {
          const ok = await sendReferralInviteEmail({
            recipientEmail: (referral as any).collectorEmail,
            recipientName: (referral as any).collectorName,
            subject: input.subject,
            body: input.message,
          });
          if (ok) sent++;
        }
        // Mark successfully-sent referrals as emailed
        const sentIds = unEmailedReferrals.map((r: any) => r.id);
        await markReferralsAsEmailed(sentIds);
        return { success: true, emailsSent: sent, skipped: referrals.length - unEmailedReferrals.length };
      }),
    removeReferralByEmail: protectedProcedure
      .input(z.object({ referralId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await markReferralAsJoined(input.referralId, input.userId);
        return { success: true };
      }),
    deleteReferral: protectedProcedure
      .input(z.object({ referralId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await removeReferral(input.referralId);
        return { success: true };
      }),
    getReferralEmailTemplate: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.templateKey, 'referral_invite')).limit(1);
      if (!template) {
        return { subject: "You're invited to join Tradebilia!", body: '' };
      }
      return { subject: (template as any).subject, body: (template as any).body };
    }),
    updateReferralEmailTemplate: protectedProcedure
      .input(z.object({ subject: z.string().min(1), body: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // Check if the row already exists, then update or insert
        const [existing] = await db.select({ id: emailTemplates.id })
          .from(emailTemplates)
          .where(eq(emailTemplates.templateKey, 'referral_invite'))
          .limit(1);
        if (existing) {
          await db.update(emailTemplates)
            .set({ subject: input.subject, body: input.body, updatedAt: now, updatedBy: ctx.user.id })
            .where(eq(emailTemplates.templateKey, 'referral_invite'));
        } else {
          await db.insert(emailTemplates)
            .values({ templateKey: 'referral_invite', subject: input.subject, body: input.body, updatedAt: now, updatedBy: ctx.user.id });
        }
        return { success: true };
      }),
    bulkDeleteReferrals: protectedProcedure
      .input(z.object({ referralIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (input.referralIds.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No referrals selected' });
        const db = await requireDb();
        await db.delete(referralRequests).where(inArray(referralRequests.id, input.referralIds));
        return { success: true, deletedCount: input.referralIds.length };
      }),
    // User suspension management
    getSuspendedUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await getSuspendedUsers();
    }),
    suspendUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), reason: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot suspend yourself' });
        const db = await requireDb();
        // Block suspending admin accounts
        const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
        if ((targetUser as any)?.role === 'admin') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot suspend an admin account' });
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // 1. Suspend the user
        await db.execute(
          sql`UPDATE users SET isSuspended = 1, suspendedAt = ${now}, suspensionReason = ${input.reason}, suspendedBy = ${ctx.user.id} WHERE id = ${input.userId}`
        );

        // 2. Deactivate all their active listings
        await db.execute(
          sql`UPDATE listings SET isActive = 0 WHERE ownerId = ${input.userId} AND isActive = 1`
        );

        // 3. Freeze all active trades (save pre-freeze status)
        await db.execute(
          sql`UPDATE tradeProposals SET preFreezStatus = status, status = 'frozen', frozenAt = ${now}, frozenReason = 'User suspended', lastActivityAt = ${now}, updatedAt = ${now}
              WHERE (requesterId = ${input.userId} OR recipientId = ${input.userId})
              AND status IN ('pending','negotiating','accepted','shipping')`
        );

        // 4. Notify the other parties in frozen trades
        const [frozenTrades] = await db.execute(
          sql`SELECT id, requesterId, recipientId, tradeReferenceNumber FROM tradeProposals
              WHERE (requesterId = ${input.userId} OR recipientId = ${input.userId})
              AND status = 'frozen' AND frozenAt = ${now}`
        );
        for (const trade of (frozenTrades as unknown as any[]) || []) {
          const otherId = trade.requesterId === input.userId ? trade.recipientId : trade.requesterId;
          await db.execute(
            sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, isRead, createdAt)
                VALUES (${trade.id}, ${otherId}, 'cancelled', ${'This trade has been paused because one of the participants has been suspended. It will resume if the suspension is lifted. You may cancel if you wish to move on.'}, 0, ${now})`
          );
        }

        // 5. Log to moderation log
        await db.execute(
          sql`INSERT INTO moderationLog (adminId, targetUserId, action, reason, createdAt) VALUES (${ctx.user.id}, ${input.userId}, 'suspend', ${input.reason}, ${now})`
        );

        return { success: true };
      }),
    unsuspendUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // 1. Unsuspend the user
        await db.execute(
          sql`UPDATE users SET isSuspended = 0, suspendedAt = NULL, suspensionReason = NULL, suspendedBy = NULL WHERE id = ${input.userId}`
        );

        // 2. Re-activate their listings
        await db.execute(
          sql`UPDATE listings SET isActive = 1 WHERE ownerId = ${input.userId} AND isActive = 0 AND status = 'active'`
        );

        // 3. Unfreeze their frozen trades (restore pre-freeze status)
        const [frozenTrades] = await db.execute(
          sql`SELECT id, requesterId, recipientId, tradeReferenceNumber, preFreezStatus FROM tradeProposals
              WHERE (requesterId = ${input.userId} OR recipientId = ${input.userId})
              AND status = 'frozen'`
        );
        for (const trade of (frozenTrades as unknown as any[]) || []) {
          const restoreStatus = trade.preFreezStatus || 'negotiating';
          await db.execute(
            sql`UPDATE tradeProposals SET status = ${restoreStatus}, preFreezStatus = NULL, frozenAt = NULL, frozenReason = NULL, lastActivityAt = ${now}, updatedAt = ${now}
                WHERE id = ${trade.id}`
          );
          // Notify both parties
          const otherId = trade.requesterId === input.userId ? trade.recipientId : trade.requesterId;
          await db.execute(
            sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, isRead, createdAt)
                VALUES (${trade.id}, ${otherId}, 'initiated', ${'The suspension has been lifted. Your trade can now continue.'}, 0, ${now})`
          );
          await db.execute(
            sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, isRead, createdAt)
                VALUES (${trade.id}, ${input.userId}, 'initiated', ${'Your suspension has been lifted. Your trade can now continue.'}, 0, ${now})`
          );
        }

        // 4. Log to moderation log
        await db.execute(
          sql`INSERT INTO moderationLog (adminId, targetUserId, action, reason, createdAt) VALUES (${ctx.user.id}, ${input.userId}, 'unsuspend', NULL, ${now})`
        );

        return { success: true };
      }),

    // Warn user
    warnUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), message: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot warn yourself' });
        const db = await requireDb();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // Insert warning record
        await db.execute(
          sql`INSERT INTO userWarnings (userId, adminId, message, createdAt) VALUES (${input.userId}, ${ctx.user.id}, ${input.message}, ${now})`
        );
        // Increment warn count and update lastWarnedAt
        await db.execute(
          sql`UPDATE users SET warnCount = warnCount + 1, lastWarnedAt = ${now} WHERE id = ${input.userId}`
        );
        // Log to moderation log
        await db.execute(
          sql`INSERT INTO moderationLog (adminId, targetUserId, action, reason, createdAt) VALUES (${ctx.user.id}, ${input.userId}, 'warn', ${input.message}, ${now})`
        );
        return { success: true };
      }),

    // Get user warnings
    getUserWarnings: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const [rows] = await db.execute(
          sql`SELECT uw.id, uw.message, uw.createdAt, u.displayName as adminName
              FROM userWarnings uw
              LEFT JOIN users u ON u.id = uw.adminId
              WHERE uw.userId = ${input.userId}
              ORDER BY uw.createdAt DESC`
        );
        return Array.isArray(rows) ? rows : [];
      }),

    // Ban user permanently
    banUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), reason: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot ban yourself' });
        const db = await requireDb();
        // Block banning admin accounts
        const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
        if ((targetUser as any)?.role === 'admin') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot ban an admin account' });
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // 1. Ban the user (also clear any suspension)
        await db.execute(
          sql`UPDATE users SET isBanned = 1, bannedAt = ${now}, banReason = ${input.reason}, bannedBy = ${ctx.user.id}, isSuspended = 0, suspendedAt = NULL, suspensionReason = NULL WHERE id = ${input.userId}`
        );

        // 2. Permanently delete all their listings
        await db.execute(
          sql`DELETE FROM listings WHERE ownerId = ${input.userId}`
        );

        // 3. Auto-cancel all active trades and notify other parties
        const [activeTrades] = await db.execute(
          sql`SELECT id, requesterId, recipientId, tradeReferenceNumber FROM tradeProposals
              WHERE (requesterId = ${input.userId} OR recipientId = ${input.userId})
              AND status IN ('pending','negotiating','accepted','shipping','frozen')`
        );
        for (const trade of (activeTrades as unknown as any[]) || []) {
          await db.execute(
            sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Trade cancelled: user account permanently banned', lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${trade.id}`
          );
          const otherId = trade.requesterId === input.userId ? trade.recipientId : trade.requesterId;
          await db.execute(
            sql`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, isRead, createdAt)
                VALUES (${trade.id}, ${otherId}, 'cancelled', ${'This trade has been cancelled because the other participant\'s account has been permanently banned.'}, 0, ${now})`
          );
        }

        // 4. Log to moderation log
        await db.execute(
          sql`INSERT INTO moderationLog (adminId, targetUserId, action, reason, createdAt) VALUES (${ctx.user.id}, ${input.userId}, 'ban', ${input.reason}, ${now})`
        );

        return { success: true };
      }),

    // Unban user
    unbanUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.execute(
          sql`UPDATE users SET isBanned = 0, bannedAt = NULL, banReason = NULL, bannedBy = NULL WHERE id = ${input.userId}`
        );
        await db.execute(
          sql`INSERT INTO moderationLog (adminId, targetUserId, action, reason, createdAt) VALUES (${ctx.user.id}, ${input.userId}, 'unban', NULL, ${now})`
        );
        return { success: true };
      }),

    // Get banned users
    getBannedUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const [rows] = await db.execute(
        sql`SELECT u.id, u.username, u.displayName, u.email, u.bannedAt, u.banReason,
                   up.avatarUrl, up.firstName, up.lastName
            FROM users u
            LEFT JOIN userProfiles up ON up.userId = u.id
            WHERE u.isBanned = 1
            ORDER BY u.bannedAt DESC`
      );
      return Array.isArray(rows) ? rows : [];
    }),

    // Support Tickets
    getAllTickets: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const [rows] = await db.execute(
        sql`SELECT st.*, u.username, u.displayName, u.email,
                   a.username as assignedAdminUsername
            FROM supportTickets st
            LEFT JOIN users u ON u.id = st.userId
            LEFT JOIN users a ON a.id = st.assignedAdminId
            ORDER BY
              CASE st.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
              CASE st.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
              st.createdAt DESC`
      );
      return Array.isArray(rows) ? rows : [];
    }),
    getTicketReplies: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const [rows] = await db.execute(
          sql`SELECT str.*, u.username, u.displayName
              FROM supportTicketReplies str
              LEFT JOIN users u ON u.id = str.senderId
              WHERE str.ticketId = ${input.ticketId}
              ORDER BY str.createdAt ASC`
        );
        return Array.isArray(rows) ? rows : [];
      }),
    replyToTicket: protectedProcedure
      .input(z.object({ ticketId: z.number(), message: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        await db.execute(
          sql`INSERT INTO supportTicketReplies (ticketId, senderId, message, isAdminReply)
              VALUES (${input.ticketId}, ${ctx.user.id}, ${input.message}, 1)`
        );
        await db.execute(
          sql`UPDATE supportTickets SET status = 'in_progress', updatedAt = NOW()
              WHERE id = ${input.ticketId} AND status = 'open'`
        );
        return { success: true };
      }),
    updateTicketStatus: protectedProcedure
      .input(z.object({ ticketId: z.number(), status: z.enum(['open','in_progress','resolved','closed']), adminNotes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        await db.execute(
          sql`UPDATE supportTickets
              SET status = ${input.status},
                  adminNotes = COALESCE(${input.adminNotes ?? null}, adminNotes),
                  resolvedAt = CASE WHEN ${input.status} IN ('resolved','closed') THEN NOW() ELSE resolvedAt END,
                  updatedAt = NOW()
              WHERE id = ${input.ticketId}`
        );
        return { success: true };
      }),
    deleteTicket: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        await db.execute(sql`DELETE FROM supportTicketReplies WHERE ticketId = ${input.ticketId}`);
        await db.execute(sql`DELETE FROM supportTickets WHERE id = ${input.ticketId}`);
        return { success: true };
      }),
    // Flagged Content
    getFlaggedContent: protectedProcedure
      .input(z.object({ status: z.enum(['pending','reviewed','dismissed','actioned']).optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const statusFilter = input?.status ?? 'pending';
        const [rows] = await db.execute(
          sql`SELECT fc.*,
                     flagger.username as flaggedByUsername, flagger.displayName as flaggedByDisplayName,
                     reviewer.username as reviewedByUsername
              FROM flaggedContent fc
              LEFT JOIN users flagger ON flagger.id = fc.flaggedByUserId
              LEFT JOIN users reviewer ON reviewer.id = fc.reviewedByAdminId
              WHERE fc.status = ${statusFilter}
              ORDER BY fc.createdAt DESC
              LIMIT 200`
        );
        return Array.isArray(rows) ? rows : [];
      }),
    reviewFlaggedContent: protectedProcedure
      .input(z.object({
        flagId: z.number(),
        action: z.enum(['reviewed','dismissed','actioned']),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        await db.execute(
          sql`UPDATE flaggedContent
              SET status = ${input.action},
                  adminNotes = ${input.adminNotes ?? null},
                  reviewedByAdminId = ${ctx.user.id},
                  reviewedAt = NOW()
              WHERE id = ${input.flagId}`
        );
        return { success: true };
      }),
    flagContent: protectedProcedure
      .input(z.object({
        contentType: z.enum(['listing','user','trade']),
        contentId: z.number(),
        reason: z.string().min(1).max(100),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const db = await requireDb();
        await db.execute(
          sql`INSERT INTO flaggedContent (contentType, contentId, flaggedByUserId, reason, description)
              VALUES (${input.contentType}, ${input.contentId}, ${ctx.user.id}, ${input.reason}, ${input.description ?? null})`
        );
        return { success: true };
      }),
    submitTicket: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        email: z.string().email().max(320),
        subject: z.string().min(1).max(255),
        message: z.string().min(10).max(5000),
        category: z.enum(['general','listing','trade','account','billing','bug','other']).default('general'),
        priority: z.enum(['low','medium','high','urgent']).default('medium'),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const ticketId = 'TKT-' + Date.now().toString(36).toUpperCase();
        // If user is logged in, link to their account; otherwise store email/name in subject
        const userId = ctx.user?.id;
        if (userId) {
          await db.execute(
            sql`INSERT INTO supportTickets (ticketId, userId, subject, message, category, priority)
                VALUES (${ticketId}, ${userId}, ${input.subject}, ${input.message}, ${input.category}, ${input.priority})`
          );
        } else {
          // For anonymous submissions, use admin user as placeholder (id=30002)
          const anonSubject = `[${input.name} <${input.email}>] ${input.subject}`;
          await db.execute(
            sql`INSERT INTO supportTickets (ticketId, userId, subject, message, category, priority)
                VALUES (${ticketId}, 30002, ${anonSubject}, ${input.message}, ${input.category}, ${input.priority})`
          );
        }
        return { success: true, ticketId };
      }),
    // Admin trade deletion — full cascade
    deleteTrade: protectedProcedure
      .input(z.object({ tradeId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const { tradeId } = input;
        // Delete all child records in dependency order before removing the proposal
        await db.execute(sql`DELETE FROM proposalReadStatus WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeActivityLog WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeAdminLog WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeAlerts WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeComplaints WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeMessages WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradePrivateNotes WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeProposalItems WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeReviews WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeTrackingNumbers WHERE proposalId = ${tradeId}`);
        await db.execute(sql`DELETE FROM tradeVotingLinks WHERE proposalId = ${tradeId}`);
        // Finally delete the proposal itself
        await db.execute(sql`DELETE FROM tradeProposals WHERE id = ${tradeId}`);
        return { success: true };
      }),
    // Get moderation audit log
    getModerationLog: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const [rows] = await db.execute(
          sql`SELECT ml.id, ml.action, ml.reason, ml.createdAt,
                     admin.displayName as adminName, admin.username as adminUsername,
                     target.displayName as targetName, target.username as targetUsername, ml.targetUserId
              FROM moderationLog ml
              LEFT JOIN users admin ON admin.id = ml.adminId
              LEFT JOIN users target ON target.id = ml.targetUserId
              ORDER BY ml.createdAt DESC
              LIMIT ${limit} OFFSET ${offset}`
        );
        return Array.isArray(rows) ? rows : [];
      }),
  }),
  // Online status procedures
  favorites: router({
    trackView: publicProcedure
      .input(z.object({ listingId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await trackListingView(input.listingId);
        return { success: true };
      }),
    addToFavorites: protectedProcedure
      .input(z.object({ listingId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const success = await addToFavorites(ctx.user.id, input.listingId);
        return { success };
      }),
    removeFromFavorites: protectedProcedure
      .input(z.object({ listingId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const success = await removeFromFavorites(ctx.user.id, input.listingId);
        return { success };
      }),
    isFavorited: protectedProcedure
      .input(z.object({ listingId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const favorited = await isFavorited(ctx.user.id, input.listingId);
        return { favorited };
      }),
    getTopMostFavorited: publicProcedure.query(async ({ ctx }) => {
      const items = await getTopMostFavoritedItems(ctx.user?.id ?? null);
      return { items };
    }),
    getTopMostViewed: publicProcedure.query(async ({ ctx }) => {
      const items = await getTopMostViewedItems(ctx.user?.id ?? null);
      return { items };
    }),
    getTopRatedTraders: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
      .query(async ({ input }) => {
        const db = await requireDb();
        const limit = input?.limit ?? 10;
        const [rows] = await db.execute(
          sql`SELECT
            u.id,
            up.displayName,
            up.avatarUrl,
            ROUND(AVG(tr.overallRating), 1) as averageRating,
            COUNT(tr.id) as reviewCount,
            (SELECT COUNT(*) FROM tradeProposals tp WHERE (tp.requesterId = u.id OR tp.recipientId = u.id) AND tp.status = 'completed') as completedTrades
          FROM users u
          LEFT JOIN userProfiles up ON up.userId = u.id
          INNER JOIN tradeReviews tr ON tr.revieweeId = u.id AND tr.isVisible = 1
          WHERE u.isBanned = 0 AND u.isSuspended = 0
          GROUP BY u.id, up.displayName, up.avatarUrl
          HAVING COUNT(tr.id) > 0
          ORDER BY averageRating DESC, reviewCount DESC
          LIMIT ${limit}`
        );
        return { traders: (rows as unknown as any[]) || [] };
      }),

    getCompletedTrades: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        sortBy: z.enum(['recent', 'value', 'items']).default('recent'),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const db = await requireDb();
        const category = input?.category;
        const sortBy = input?.sortBy ?? 'recent';
        const limit = input?.limit ?? 20;
        const offset = input?.offset ?? 0;

        const orderClause = sortBy === 'value'
          ? 'ORDER BY totalValue DESC'
          : sortBy === 'items'
          ? 'ORDER BY itemCount DESC'
          : 'ORDER BY tp.completedAt DESC';

        const categoryFilter = category && category !== 'all'
          ? `AND (l.category = '${category}' OR EXISTS (SELECT 1 FROM listings ol JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id WHERE tpi.proposalId = tp.id AND ol.category = '${category}'))`
          : '';

        const [rows] = await db.execute(
          sql`SELECT
            tp.id,
            tp.tradeReferenceNumber,
            tp.completedAt,
            tp.requesterId,
            tp.recipientId,
            -- Requester info
            req_up.displayName as requesterDisplayName,
            req_up.avatarUrl as requesterAvatarUrl,
            -- Recipient info
            rec_up.displayName as recipientDisplayName,
            rec_up.avatarUrl as recipientAvatarUrl,
            -- Requested listing (the item that started the trade)
            l.id as requestedListingId,
            l.title as requestedListingTitle,
            l.category as requestedListingCategory,
            l.estimatedValue as requestedListingValue,
            (SELECT imageUrl FROM listingPhotos WHERE listingId = l.id ORDER BY sortOrder ASC LIMIT 1) as requestedListingImage,
            -- Item count and total value
            (SELECT COUNT(*) FROM tradeProposalItems WHERE proposalId = tp.id) + 1 as itemCount,
            (SELECT COALESCE(SUM(ol.estimatedValue), 0) FROM listings ol JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id WHERE tpi.proposalId = tp.id) + COALESCE(l.estimatedValue, 0) as totalValue
          FROM tradeProposals tp
          LEFT JOIN users req_u ON req_u.id = tp.requesterId
          LEFT JOIN userProfiles req_up ON req_up.userId = tp.requesterId
          LEFT JOIN users rec_u ON rec_u.id = tp.recipientId
          LEFT JOIN userProfiles rec_up ON rec_up.userId = tp.recipientId
          LEFT JOIN listings l ON l.id = tp.requestedListingId
          WHERE tp.status = 'completed'
            AND tp.completedAt IS NOT NULL
            ${sql.raw(categoryFilter)}
          ${sql.raw(orderClause)}
          LIMIT ${limit} OFFSET ${offset}`
        );

        const trades = (rows as unknown as any[]) || [];

        // For each trade, also fetch the offered items (up to 4 for display)
        const enriched = await Promise.all(trades.map(async (trade: any) => {
          const [offeredRows] = await db.execute(
            sql`SELECT ol.id, ol.title, ol.category, ol.estimatedValue,
              (SELECT imageUrl FROM listingPhotos WHERE listingId = ol.id ORDER BY sortOrder ASC LIMIT 1) as imageUrl
            FROM listings ol
            JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id
            WHERE tpi.proposalId = ${trade.id}
            LIMIT 4`
          );
          return {
            ...trade,
            offeredItems: (offeredRows as unknown as any[]) || [],
          };
        }));

        return { trades: enriched };
      }),
  }),
  onlineStatus: router({
    updateActivity: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      // Only update lastActivityAt if user is authenticated
      if (ctx.user?.id) {
        await db.update(users).set({ lastActivityAt: mysqlNow() }).where(eq(users.id, ctx.user.id));
      }
      return { success: true };
    }),
    getSellerOnlineStatus: publicProcedure
      .input(z.object({ sellerId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const seller = await db.select({ lastActivityAt: users.lastActivityAt, id: users.id, name: users.name }).from(users).where(eq(users.id, input.sellerId)).limit(1);
        if (!seller.length) return { isOnline: false };
        const lastActivity = seller[0].lastActivityAt;
        const now = new Date();
        const timeSinceActivity = now.getTime() - new Date(lastActivity).getTime();
        const ONLINE_STATUS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
        const isOnline = timeSinceActivity < ONLINE_STATUS_TIMEOUT_MS;
        // Removed verbose logging to reduce I/O overhead during high request volume
        return { isOnline, lastActivityAt: lastActivity };
      }),
    getMultipleSellerOnlineStatus: publicProcedure
      .input(z.object({ sellerIds: z.array(z.number().int().positive()) }))
      .query(async ({ input }) => {
        if (!input.sellerIds.length) return {};
        const db = await requireDb();
        const sellers = await db.select({ id: users.id, lastActivityAt: users.lastActivityAt }).from(users).where(inArray(users.id, input.sellerIds));
        const ONLINE_STATUS_TIMEOUT_MS = 5 * 60 * 1000;
        const now = new Date();
        const result: Record<number, { isOnline: boolean; lastActivityAt: string | null }> = {};
        sellers.forEach(seller => {
          const timeSinceActivity = now.getTime() - new Date(seller.lastActivityAt).getTime();
          result[seller.id] = {
            isOnline: timeSinceActivity < ONLINE_STATUS_TIMEOUT_MS,
            lastActivityAt: seller.lastActivityAt
          };
        });
        return result;
      }),
  }),
  conventions: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        country: z.string().optional(),
        state: z.string().optional(),
      }).optional())
      .query(({ input }) => getConventions(input ?? {})),

    upcoming: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(10).optional() }).optional())
      .query(async ({ ctx, input }) => {
        // Only return conventions if the user is logged in
        if (!ctx.user) return [];
        // Get user's location from their profile
        const { userProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await (await import("./db")).requireDb();
        const [profile] = await db
          .select({ state: userProfiles.contactState, country: userProfiles.contactCountry })
          .from(userProfiles)
          .where(eq(userProfiles.userId, ctx.user.id));
        const userLocation = profile
          ? { state: profile.state || null, country: profile.country || null }
          : {};
        return getUpcomingConventions(input?.limit ?? 3, userLocation);
      }),

    submit: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(255),
        category: z.string().min(1),
        categories: z.array(z.string()).optional(), // multi-category support
        startDate: z.string().min(8).max(20),
        endDate: z.string().max(20).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        country: z.string().min(2).max(100),
        venue: z.string().max(255).optional(),
        website: z.string().max(500).optional(),
        admission: z.string().max(100).optional(),
        description: z.string().max(2000).optional(),
      }))
      .mutation(({ ctx, input }) => submitConvention({ ...input, submittedBy: ctx.user?.id })),

    pending: publicProcedure
      .query(() => getPendingConventions()),

    approve: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return approveConvention(input.id, ctx.user.id);
      }),

    reject: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return rejectConvention(input.id, ctx.user.id);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return deleteConvention(input.id);
      }),

    scrape: publicProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { runConventionScraper } = await import('./conventionScraper');
        return runConventionScraper();
      }),
  }),

  // ─── Payment Router (PayPal Phase 1) ─────────────────────────────────────
  payment: router({
    /**
     * Get the current user's saved PayPal email and verification status.
     */
    getPayPalEmail: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const result = await db
        .select({
          paypalEmail: users.paypalEmail,
          paypalVerified: users.paypalVerified,
          paypalVerifiedAt: users.paypalVerifiedAt,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      return result[0] ?? { paypalEmail: null, paypalVerified: 0, paypalVerifiedAt: null };
    }),

    /**
     * Save or update the current user's PayPal email address.
     */
    savePayPalEmail: protectedProcedure
      .input(z.object({ email: z.string().email().max(320) }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await db
          .update(users)
          .set({ paypalEmail: input.email, paypalVerified: 0, paypalVerifiedAt: null })
          .where(eq(users.id, ctx.user.id));
        return { success: true };
      }),

    /**
     * Verify a PayPal transaction ID against the seller's PayPal email and amount.
     * Logs the result to the trade activity log.
     */
    verifyPayment: protectedProcedure
      .input(z.object({
        proposalId: z.number().int().positive(),
        transactionId: z.string().min(1).max(255),
        payeeUserId: z.number().int().positive(),
        amount: z.number().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();

        // Get the payee's PayPal email
        const payeeResult = await db
          .select({ paypalEmail: users.paypalEmail })
          .from(users)
          .where(eq(users.id, input.payeeUserId))
          .limit(1);

        const payeePaypalEmail = payeeResult[0]?.paypalEmail;
        if (!payeePaypalEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The seller has not set up a PayPal email address.",
          });
        }

        // Log: payment step started
        await db.insert(tradeActivityLog).values({
          proposalId: input.proposalId,
          actorId: ctx.user.id,
          actorName: ctx.user.name ?? ctx.user.username ?? "User",
          eventType: "payment_verification_started",
          details: JSON.stringify({ transactionId: input.transactionId, amount: input.amount }),
        });

        // Verify with PayPal
        const result = await verifyPayPalTransaction(
          input.transactionId,
          payeePaypalEmail,
          input.amount
        );

        // Upsert tradePayments record
        const existing = await db
          .select({ id: tradePayments.id })
          .from(tradePayments)
          .where(
            and(
              eq(tradePayments.proposalId, input.proposalId),
              eq(tradePayments.payerId, ctx.user.id)
            )
          )
          .limit(1);

        const paymentData = {
          proposalId: input.proposalId,
          payerId: ctx.user.id,
          payeeId: input.payeeUserId,
          amount: input.amount.toFixed(2),
          paypalEmail: payeePaypalEmail,
          transactionId: input.transactionId,
          status: (result.verified ? "verified" : "failed") as "verified" | "failed",
          verificationResult: JSON.stringify(result),
          verifiedAt: result.verified ? mysqlNow() : null,
        };

        if (existing.length > 0) {
          await db.update(tradePayments).set(paymentData).where(eq(tradePayments.id, existing[0].id));
        } else {
          await db.insert(tradePayments).values(paymentData);
        }

        // Log: verification result
        await db.insert(tradeActivityLog).values({
          proposalId: input.proposalId,
          actorId: ctx.user.id,
          actorName: ctx.user.name ?? ctx.user.username ?? "User",
          eventType: result.verified ? "payment_verified" : "payment_verification_failed",
          details: JSON.stringify({
            transactionId: input.transactionId,
            verified: result.verified,
            reason: result.reason,
            amount: input.amount,
          }),
        });

        // If verified, mark the user as paypalVerified
        if (result.verified) {
          await db
            .update(users)
            .set({ paypalVerified: 1, paypalVerifiedAt: mysqlNow() })
            .where(eq(users.id, ctx.user.id));
        }

        return result;
      }),

    /**
     * Get the payment status for a specific trade proposal and payer.
     */
    getPaymentStatus: protectedProcedure
      .input(z.object({ proposalId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await requireDb();
        const result = await db
          .select()
          .from(tradePayments)
          .where(
            and(
              eq(tradePayments.proposalId, input.proposalId),
              eq(tradePayments.payerId, ctx.user.id)
            )
          )
          .limit(1);
        return result[0] ?? null;
      }),
  }),
});

export type AppRouter = typeof appRouter;
