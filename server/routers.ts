import { z } from "zod";
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
  getUnreadNotificationCount,
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
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { hashPassword, verifyPassword, isValidUsername, isValidPassword, isValidEmail } from "./_core/auth";
import { getUserByUsername, createUser, requireDb } from "./db";
import { getEbayAuthUrl, exchangeCodeForToken, getUserInfo, getUserFeedback, refreshAccessToken } from "./_core/ebay";
import { sdk } from "./_core/sdk";
import { tradeFlowRouter } from "./tradeFlowRouter";
import { customAuth } from "./_core/customAuth";
import { users, userProfiles, listings, deletedAccounts, tradeProposals, tradeMessages, tradeReviews, watchlistEntries, draftListings, passwordResetTokens, referralRequests } from "../drizzle/schema";
import { eq, sql, desc, or, inArray } from "drizzle-orm";
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
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);
      
      return {
        ...user,
        firstName: profile[0]?.firstName ?? null,
        lastName: profile[0]?.lastName ?? null,
        avatarUrl: profile[0]?.avatarUrl ?? null,
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
      const unreadNotificationsResult = await getUnreadNotificationCount(ctx.user.id);
      const unreadMessagesResult = await getUnreadMessageCount(ctx.user.id);
      return {
        unreadNotifications: unreadNotificationsResult?.count ?? 0,
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
        const user = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (!user.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, input.userId)).limit(1);
        const userListings = await db.select().from(listings).where(eq(listings.ownerId, input.userId)).limit(100);
        
        // Fetch real stats
        const [statsResult] = await db.execute(
          sql`SELECT 
            (SELECT COUNT(*) FROM listings WHERE ownerId = ${input.userId} AND status = 'active' AND isActive = 1) as itemsListed,
            (SELECT COUNT(*) FROM tradeProposals WHERE (requesterId = ${input.userId} OR recipientId = ${input.userId}) AND status = 'completed') as completedTrades,
            (SELECT AVG(overallRating) FROM tradeReviews WHERE revieweeId = ${input.userId} AND isVisible = 1) as avgRating
          `
        );
        const stats = (statsResult as any)?.[0] || { itemsListed: 0, completedTrades: 0, avgRating: 0 };

        // Fetch reviews
        const [reviewsResult] = await db.execute(
          sql`SELECT 
            tr.id, tr.overallRating, tr.review, tr.createdAt, 
            up.displayName as reviewerName, up.avatarUrl as reviewerAvatar, u.username as reviewerUsername
          FROM tradeReviews tr
          LEFT JOIN users u ON u.id = tr.reviewerId
          LEFT JOIN userProfiles up ON up.userId = tr.reviewerId
          WHERE tr.revieweeId = ${input.userId} AND tr.isVisible = 1 AND tr.review IS NOT NULL AND tr.review != ''
          ORDER BY tr.createdAt DESC
          LIMIT 20`
        );
        const reviews = (reviewsResult as any) || [];

        return {
          user: user[0],
          profile: profile[0] || null,
          listings: userListings,
          stats: {
            itemsListed: stats.itemsListed || 0,
            completedTrades: stats.completedTrades || 0,
            avgRating: parseFloat(stats.avgRating || '0').toFixed(1),
          },
          reviews,
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
          securityQuestion: z.string().max(255).optional(),
          securityAnswer: z.string().max(255).optional(),
          preferredCategories: z.array(z.enum(collectibleCategories)).optional(),
          notificationPreferences: z.object({
            tradeRequests: z.boolean().optional(),
            messages: z.boolean().optional(),
            feedback: z.boolean().optional(),
            systemUpdates: z.boolean().optional(),
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

        // Check if any identity field is being modified by a non-admin user
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
              message: 'Identity fields cannot be modified. These fields were verified during account setup and can only be changed by administrators. Contact support if you need to update them.',
            });
          }
        }
        
        // Identity fields are persisted when the caller is an admin OR this is
        // the user's first-time account setup (their own verified info).
        const canWriteIdentity = isAdmin || isFirstTimeSetup;
        return updateProfile(
          { id: userId, name: input.displayName },
          {
            displayName: input.displayName,
            bio: input.bio,
            contactFullName: canWriteIdentity ? input.contactFullName : undefined,
            contactEmail: canWriteIdentity ? input.contactEmail : undefined,
            contactPhone: canWriteIdentity ? input.contactPhone : undefined,
            contactAddress: canWriteIdentity ? input.contactAddress : undefined,
            contactTown: canWriteIdentity ? input.contactTown : undefined,
            contactState: canWriteIdentity ? input.contactState : undefined,
            contactZipCode: canWriteIdentity ? input.contactZipCode : undefined,
            contactCountry: canWriteIdentity ? input.contactCountry : undefined,
            firstName: canWriteIdentity ? input.firstName : undefined,
            lastName: canWriteIdentity ? input.lastName : undefined,
            avatar: input.avatar ? { name: input.avatar.name, type: input.avatar.type, contentBase64: input.avatar.contentBase64! } : null,
            acceptedTerms: input.acceptedTerms,
            isMerchant: input.isMerchant,
            securityQuestion: input.securityQuestion,
            securityAnswer: input.securityAnswer,
            preferredCategories: input.preferredCategories,
            notificationPreferences: input.notificationPreferences,
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
        await db.update(userProfiles).set({
          securityQuestion: input.securityQuestion,
          securityAnswer: input.securityAnswer,
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
          connectedAccounts: z.array(z.enum(["ebay", "paypal", "facebook"])),
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
          photos: z.array(uploadedImageSchema).max(6),
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
          photos: z.array(uploadedImageSchema).max(6),
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
        return sendItemInquiry({ id: ctx.user.id, name: ctx.user.name }, input);
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
        
        // Separate fields for users table vs userProfiles table
        const usersTableFields: any = {};
        const userProfilesTableFields: any = {};
        
        // Fields that belong to users table
        if (updateData.displayName !== undefined && updateData.displayName !== null && updateData.displayName !== '') {
          usersTableFields.displayName = updateData.displayName;
        }
        
        // Fields that belong to userProfiles table
        const profileFields = ['firstName', 'lastName', 'contactFullName', 'contactPhone', 'contactEmail', 'contactAddress', 'contactTown', 'contactState', 'contactZipCode', 'contactCountry'];
        profileFields.forEach(field => {
          const value = updateData[field as keyof typeof updateData];
          if (value !== undefined && value !== null && value !== '') {
            userProfilesTableFields[field] = value;
          }
        });
        
        // Update users table if there are fields to update
        if (Object.keys(usersTableFields).length > 0) {
          await db.update(users).set(usersTableFields).where(eq(users.id, userId));
        }
        
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
        await markReferralsAsEmailed(input.referralIds);
        return { success: true, emailsSent: referrals.length };
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
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot suspend yourself' });
        return await suspendUser(input.userId);
      }),
    unsuspendUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await unsuspendUser(input.userId);
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
});

export type AppRouter = typeof appRouter;
