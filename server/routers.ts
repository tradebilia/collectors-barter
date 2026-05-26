import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { collectibleCategories, itemConditions } from "../drizzle/schema";
import {
  createListing,
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
  deleteDraft,
  getSiteStatistics,
  submitUserReport,
  getUserReports,
  getUserReportDetails,
  updateReportStatus,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { hashPassword, verifyPassword, isValidUsername, isValidPassword, isValidEmail } from "./_core/auth";
import { getUserByUsername, createUser, requireDb } from "./db";
import { sdk } from "./_core/sdk";
import { customAuth } from "./_core/customAuth";
import { users, userProfiles, listings, deletedAccounts, tradeProposals, tradeMessages, tradeReviews, watchlistEntries, draftListings, passwordResetTokens } from "../drizzle/schema";
import { eq, sql, desc, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ONE_YEAR_MS } from "@shared/const";

const uploadedImageSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(120),
  contentBase64: z.string().min(1),
});

const listingFiltersSchema = z.object({
  category: z.enum(collectibleCategories).optional(),
  condition: z.enum(itemConditions).optional(),
  keyword: z.string().max(100).optional(),
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
  message: z.string().min(20).max(2000),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async opts => {
      console.log('[auth.me] Called, user:', opts.ctx.user?.username);
      const user = opts.ctx.user;
      if (!user) {
        console.log('[auth.me] No user found, returning null');
        return null;
      }
      
      const db = await requireDb();
      const profile = await db
        .select({
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);
      
      return {
        ...user,
        firstName: profile[0]?.firstName ?? null,
        lastName: profile[0]?.lastName ?? null,
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
        console.log("[signup] Called with username:", input.username);
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

        const passwordHash = hashPassword(input.password);
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
        const user = await getUserByUsername(input.username);
        if (!user || !user.passwordHash) {
          throw new Error("Invalid username or password");
        }

        const passwordMatch = verifyPassword(input.password, user.passwordHash);
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
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    unreadCounts: protectedProcedure.query(async ({ ctx }) => {
      const unreadNotifications = await getUnreadNotificationCount(ctx.user.id);
      const unreadMessages = await getUnreadMessageCount(ctx.user.id);
      return {
        unreadNotifications,
        unreadMessages,
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
    saveProfile: publicProcedure
      .input(
        z.object({
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
        console.log("[saveProfile] Called with input:", input);
        
        // Validate user is authenticated or has userId
        const userId = ctx.user?.id || input.userId;
        if (!userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Please login to save profile',
          });
        }
        
        
        return updateProfile(
          { id: typeof userId === 'string' ? parseInt(userId, 10) : userId, name: input.displayName },
          {
            displayName: input.displayName,
            bio: input.bio,
            contactFullName: input.contactFullName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            contactAddress: input.contactAddress,
            contactTown: input.contactTown,
            contactState: input.contactState,
            contactZipCode: input.contactZipCode,
            contactCountry: input.contactCountry,
            firstName: input.firstName,
            lastName: input.lastName,
            avatar: input.avatar ?? null,
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
        const isValid = verifyPassword(input.currentPassword, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        const newHash = hashPassword(input.newPassword);
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
          emailFrequency: z.enum(["daily", "weekly", "monthly", "never"]),
          tradeNotifications: z.boolean(),
          messageNotifications: z.boolean(),
          feedbackNotifications: z.boolean(),
          systemNotifications: z.boolean(),
          marketingEmails: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Store communication preferences in userProfiles table
        const db = await requireDb();
        await db.update(userProfiles).set({
          notificationPreferences: JSON.stringify({
            emailFrequency: input.emailFrequency,
            tradeNotifications: input.tradeNotifications,
            messageNotifications: input.messageNotifications,
            feedbackNotifications: input.feedbackNotifications,
            systemNotifications: input.systemNotifications,
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
          showProfile: input.showProfile,
          hideInventoryValue: input.hideInventoryValue,
          receiveContactRequests: input.receiveContactRequests,
        }).where(eq(userProfiles.userId, ctx.user.id));
        console.log('[savePreferences] Update result:', result);
        return { success: true };
      }),
    createListing: protectedProcedure
      .input(
        z.object({
          title: z.string().min(3).max(160),
          category: z.enum(collectibleCategories),
          condition: z.enum(itemConditions),
          description: z.string().min(20).max(4000),
          estimatedValue: z.number().nonnegative().optional(),
          photos: z.array(uploadedImageSchema).max(6),
        }),
      )
      .mutation(({ ctx, input }) => {
        return createListing(
          { id: ctx.user.id, name: ctx.user.name },
          {
            title: input.title,
            category: input.category,
            condition: input.condition,
            description: input.description,
            estimatedValue: input.estimatedValue,
            photos: input.photos,
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
        await bulkUpdateListingStatus({ id: ctx.user.id, name: ctx.user.name }, { listingIds: input.listingIds, isActive: input.newStatus });
        return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
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
        const delivered = await notifyOwner({
          title: `Tradebilia referral request: ${input.friendName.trim()}`,
          content: [
            `Referrer: ${referrerName}`,
            `Referrer user ID: ${ctx.user.id}`,
            `Referrer account email: ${ctx.user.email ?? "Not available"}`,
            `Referral candidate name: ${input.friendName.trim()}`,
            `Referral candidate email: ${input.friendEmail.trim()}`,
            `Collector focus: ${input.collectorFocus.trim()}`,
            `Referral message: ${input.message.trim()}`,
          ].join("\n"),
        });

        return {
          success: delivered,
          message: delivered
            ? "Your referral request was sent for Tradebilia review."
            : "Your referral request could not be delivered right now. Please try again shortly.",
        };
      }),
    saveDraft: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(160),
          category: z.enum(collectibleCategories),
          grade: z.string(),
          graderCompany: z.string().max(100),
          certificationNumber: z.string().max(100).optional(),
          estimatedValue: z.number().nonnegative().optional(),
          categoryFields: z.record(z.string(), z.string()),
          additionalNotes: z.string().max(4000).optional(),
          photos: z.array(uploadedImageSchema),
        }),
      )
      .mutation(({ ctx, input }) => {
        // saveDraft currently only accepts title, category, condition, description, and photos
        // The input schema has more fields (grade, graderCompany, etc.) that will be stored separately
        return saveDraft({ id: ctx.user.id, name: ctx.user.name }, {
          title: input.title,
          category: input.category,
          condition: "poor", // Will be updated when user completes the listing
          description: input.additionalNotes || "",
          photos: input.photos,
        });
      }),
    getDrafts: protectedProcedure.query(({ ctx }) => {
      return getDrafts({ id: ctx.user.id, name: ctx.user.name });
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
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        displayName: userProfiles.displayName,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
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
        role: string;
        createdAt: Date;
        contactFullName: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        contactAddress: string | null;
        contactTown: string | null;
        contactState: string | null;
        contactZipCode: string | null;
        contactCountry: string | null;
      }>;
      return allUsers;
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
        await db.insert(deletedAccounts).values({
          userId: input.userId,
          username: user.username,
          email: user.email || null,
          displayName: profile?.displayName || user.displayName || null,
          firstName: profile?.firstName || null,
          lastName: profile?.lastName || null,
          deletedBy: ctx.user.id,
          reason: 'Admin deletion',
        } as any);
        
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
      // This will be implemented with proper queries
      return [];
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
  }),
  // Online status procedures
  onlineStatus: router({
    updateActivity: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      await db.update(users).set({ lastActivityAt: new Date() }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
    getSellerOnlineStatus: publicProcedure
      .input(z.object({ sellerId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const seller = await db.select({ lastActivityAt: users.lastActivityAt }).from(users).where(eq(users.id, input.sellerId)).limit(1);
        if (!seller.length) return { isOnline: false };
        const lastActivity = seller[0].lastActivityAt;
        const now = new Date();
        const timeSinceActivity = now.getTime() - lastActivity.getTime();
        const ONLINE_STATUS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
        const isOnline = timeSinceActivity < ONLINE_STATUS_TIMEOUT_MS;
        return { isOnline, lastActivityAt: lastActivity };
      }),
  }),
});

export type AppRouter = typeof appRouter;


// Add these procedures before the closing of admin router
// Reported users management
export const reportedUsersRouter = router({
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
});
