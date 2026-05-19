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
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { hashPassword, verifyPassword, isValidUsername, isValidPassword, isValidEmail } from "./_core/auth";
import { getUserByUsername, createUser, requireDb } from "./db";
import { sdk } from "./_core/sdk";
import { users, userProfiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
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
    me: publicProcedure.query(opts => opts.ctx.user),
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

        const passwordHash = hashPassword(input.password);
        const userId = await createUser({
          username: input.username,
          passwordHash,
          displayName: input.displayName,
          email: input.email,
        });

        const sessionToken = await sdk.createSessionToken(String(userId), {
          name: input.displayName,
          expiresInMs: ONE_YEAR_MS,
        });

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
        ctx.res.cookie("session", sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, userId: user.id };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("session", { ...cookieOptions, maxAge: -1 });
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
      .query(({ ctx, input }) => {
        return getListingDetail(input.listingId, ctx.user?.id ?? null);
      }),
    saveProfile: protectedProcedure
      .input(
        z.object({
          displayName: z.string().min(2).max(120),
          bio: z.string().max(500).optional(),
          contactFullName: z.string().max(160).optional(),
          contactEmail: z.string().email().max(320).optional().or(z.literal("")),
          contactPhone: z.string().max(40).optional(),
          contactAddress: z.string().max(320).optional(),
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
      .mutation(({ ctx, input }) => {
        console.log("[saveProfile] Called with input:", input);
        return updateProfile(
          { id: ctx.user.id, name: ctx.user.name },
          {
            displayName: input.displayName,
            bio: input.bio,
            contactFullName: input.contactFullName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            contactAddress: input.contactAddress,
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
        const answerHash = hashPassword(input.securityAnswer);
        const db = await requireDb();
        await db.update(users).set({
          securityQuestion: input.securityQuestion,
          securityAnswerHash: answerHash,
        }).where(eq(users.id, ctx.user.id));
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
        await db.update(userProfiles).set({
          preferredCategories: JSON.stringify(input.preferredCategories),
          showProfile: input.showProfile,
          hideInventoryValue: input.hideInventoryValue,
          receiveContactRequests: input.receiveContactRequests,
        }).where(eq(userProfiles.userId, ctx.user.id));
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
  }),
});

export type AppRouter = typeof appRouter;
