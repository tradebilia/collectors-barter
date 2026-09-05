import { z } from "zod";
import { verifyPayPalTransaction } from "./paypal";
import { resolveDirectMessageDisplayName } from "./directMessageDisplayName";
import { sendVerificationCode, checkVerificationCode, normalizePhone, maskPhone } from "./twilio";
import { COOKIE_NAME } from "@shared/const";
import { collectibleCategories, itemConditions, mysqlNow, toMysqlDateTime } from "./db";
import { isValidGradeForCompany, getGradingCompanyByName } from "@shared/gradingCompanyConfig";
import {
  createListing,
  getCommunicationDisplayName,
  updateListing,
  createTradeProposal,
  getDashboardData,
  getTradebiliaContactIdentity,
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
  getReportsByReporter,
  getTopHighestValueItems,
  getUserReportDetails,
  updateReportStatus,
  uploadReportEvidence,
  updateUserEbayInfo,
  getUserEbayInfo,
  storeEbayFeedback,
  getUserEbayFeedback,
  flagLowFeedback,
  getUserFacebookInfo,
  getUserLinkedInInfo,
  getUserEtsyInfo,
  getPublicEtsyVerification,
  clearUserEtsyInfo,
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
  updateForumPost,
  deleteForumPost,
  addForumPostAttachment,
  getForumPostAttachments,
  addForumReplyAttachment,
  createForumReport,
  getForumReportsForAdmin,
  reviewForumReport,
  getMyForumNotifications,
  markForumNotificationRead,
  moderateForumPost,
  toggleForumFollow,
  isFollowingForumPost,
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
  getCustomGradingCompany,
} from "./db";
import { ownsReportAttachment, serializeReportEvidence } from "./reportEvidence";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { notifyOwner } from "./_core/notification";
import { sendAccountEmailVerificationCode, sendNewDirectMessageEmail, sendDirectMessageReplyEmail, sendPasswordRecoveryEmail, sendReferralInviteEmail } from "./_core/email";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { hashPassword, verifyPassword, isValidUsername, isValidPassword, isValidEmail } from "./_core/auth";
import { createEmailOtp, createPasswordResetToken, createUser, deleteEmailOtp, deletePasswordResetTokensForUser, getEmailOtp, getPasswordResetToken, getUserByUsername, incrementEmailOtpAttempts, requireDb, updateUserPassword } from "./db";
import { getEbayAuthUrl, exchangeCodeForToken, getUserInfo, getUserFeedback, refreshAccessToken } from "./_core/ebay";
import { sdk } from "./_core/sdk";
import { tradeFlowRouter } from "./tradeFlowRouter";
import { testAIRouter } from "./testAIRouter";
import { r2MediaRouter } from "./r2MediaRouter";
import { customAuth } from "./_core/customAuth";
import { getOrCreateDirectMessageThread, persistDirectMessage } from "./directMessagePersistence";
import { setIdentityRestrictionStatus } from "./identityRegistry";
import { users, userProfiles, listings, deletedAccounts, tradeProposals, tradeProposalItems, tradeMessages, tradeReviews, watchlistEntries, draftListings, passwordResetTokens, referralRequests, userFollows, directMessageThreads, directMessages, tradePayments, tradeActivityLog, emailTemplates, accountApprovalReviews, accountClosureRequests, apiHealthEvents, adminActivityLog, lowFeedbackFlags } from "../drizzle/schema";
import { storagePut } from "./storage";
import { forumTaxonomy, forumParentLevelSubcategory } from "@shared/forum";
import { eq, sql, desc, asc, or, inArray, and, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { TRPCError } from "@trpc/server";
import { isPublicMemberEligible } from "./publicVisibility";
import { ONE_YEAR_MS } from "@shared/const";
import { subscribeToLaunchUpdates } from "./launchUpdates";
import { isLaunchUpdateRequestAllowed, normalizeLaunchUpdateEmail } from "./launchUpdatesRateLimit";
import { getPreLaunchRecipients, sendPreLaunchUpdate } from "./preLaunchEmail";
import { validateFirstTimeSetupRequirements } from "./accountSetupRequirements";
import { PASSWORD_RECOVERY_TOKEN_TTL_MS, createOpaqueRecoveryToken, createSixDigitCode, hashRecoveryToken, isRecoveryRequestAllowed, isRecoveryTokenExpired, normalizeRecoveryEmail, timingSafeTextEquals } from "./accountRecovery";
import { createPendingEmailHistoryApproval, requireMarketplaceApproval } from "./accountApproval";
import { getIpqsEmailHistory } from "./ipqs";
import { createProviderOauthState, setProviderOauthStateCookie } from "./_core/providerOauthState";
import { getEtsyAuthUrl, createEtsyPkceVerifier } from "./_core/etsy";
import { getPaymentVerificationObligation, getPaymentVerificationObligations, isAuthorizedPaymentVerification } from "./paymentAuthorization";
import { resolveProfileTimeZone } from "./profileTimeZone";
import { EXTERNAL_PAYMENT_METHODS, type ExternalPaymentMethod, getEnabledExternalPaymentMethods, getExternalPaymentIdentifier, getExternalPaymentMethodLabel, getSharedExternalPaymentMethods, maskExternalPaymentIdentifier } from "./externalPaymentMethods";
import { billingRouter, membershipRouter } from "./membership";
import { listHeartbeatJobs } from "./_core/heartbeat";
import { closeEligibleAccount, getAccountClosureAudit, getAccountClosureRequestsForAdmin, getMyAccountClosureRequest, requestAccountClosure, reviewAccountClosureRequest } from "./accountClosure";

const ADMIN_ARCHIVE_MEMBER_PHRASE = "ARCHIVE MEMBER ACCOUNT";
const ADMIN_ARCHIVE_TRADE_PHRASE = "ARCHIVE TRADE RECORD";
const ADMIN_CLOSE_TICKET_PHRASE = "CLOSE AND RETAIN TICKET";
const ADMIN_REVEAL_CASH_IDENTIFIER_PHRASE = "REVEAL CASH PAYMENT IDENTIFIER";

const externalPaymentMethodSchema = z.enum(EXTERNAL_PAYMENT_METHODS);

const externalPaymentMethodsInputSchema = z.object({
  enabledMethods: z.object({
    paypal: z.boolean(),
    venmo: z.boolean(),
    cash_app: z.boolean(),
    zelle: z.boolean(),
  }).optional(),
  paypalEmail: z.string().trim().email().max(320).nullable().optional(),
  venmoUsername: z.string().trim().min(1).max(80).nullable().optional(),
  cashAppCashtag: z.string().trim().min(1).max(80).nullable().optional(),
  zelleEmail: z.string().trim().email().max(320).nullable().optional(),
  zellePhone: z.string().trim().min(7).max(32).nullable().optional(),
}).superRefine((input, ctx) => {
  const enabled = input.enabledMethods ?? {
    paypal: Boolean(input.paypalEmail),
    venmo: Boolean(input.venmoUsername),
    cash_app: Boolean(input.cashAppCashtag),
    zelle: Boolean(input.zelleEmail || input.zellePhone),
  };
  if (enabled.paypal && !input.paypalEmail) {
    ctx.addIssue({ code: "custom", message: "Enter the email address for enabled PayPal.", path: ["paypalEmail"] });
  }
  if (enabled.venmo && !input.venmoUsername) {
    ctx.addIssue({ code: "custom", message: "Enter the username for enabled Venmo.", path: ["venmoUsername"] });
  }
  if (enabled.cash_app && !input.cashAppCashtag) {
    ctx.addIssue({ code: "custom", message: "Enter the $cashtag for enabled Cash App.", path: ["cashAppCashtag"] });
  }
  if (enabled.zelle && !input.zelleEmail && !input.zellePhone) {
    ctx.addIssue({ code: "custom", message: "Enter an email address or U.S. mobile number for enabled Zelle.", path: ["zelleEmail"] });
  }
  if (enabled.zelle && input.zelleEmail && input.zellePhone) {
    ctx.addIssue({ code: "custom", message: "Use one Zelle destination: an email address or a U.S. mobile number, not both.", path: ["zellePhone"] });
  }
  if (enabled.venmo && input.venmoUsername && !/^[A-Za-z0-9_-]{3,30}$/.test(input.venmoUsername.replace(/^@+/, ""))) {
    ctx.addIssue({ code: "custom", message: "Enter a valid Venmo username using 3–30 letters, numbers, underscores, or hyphens.", path: ["venmoUsername"] });
  }
  if (enabled.cash_app && input.cashAppCashtag && !/^\$?[A-Za-z][A-Za-z0-9_]{0,19}$/.test(input.cashAppCashtag)) {
    ctx.addIssue({ code: "custom", message: "Enter a valid Cash App $cashtag starting with a letter and using up to 20 letters, numbers, or underscores.", path: ["cashAppCashtag"] });
  }
  if (enabled.zelle && input.zellePhone && input.zellePhone.replace(/\D/g, "").length !== 10) {
    ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit U.S. mobile number for Zelle.", path: ["zellePhone"] });
  }
});

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function normalizeVenmoUsername(value?: string | null) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/^@+/, "") : null;
}

function normalizeCashAppCashtag(value?: string | null) {
  const normalized = normalizeOptionalText(value);
  return normalized ? `$${normalized.replace(/^\$+/, "")}` : null;
}

function normalizeExternalPaymentMethods(input: z.infer<typeof externalPaymentMethodsInputSchema>) {
  const enabled = input.enabledMethods ?? {
    paypal: Boolean(input.paypalEmail),
    venmo: Boolean(input.venmoUsername),
    cash_app: Boolean(input.cashAppCashtag),
    zelle: Boolean(input.zelleEmail || input.zellePhone),
  };
  return {
    paypalEmail: enabled.paypal ? normalizeOptionalText(input.paypalEmail)?.toLowerCase() ?? null : null,
    venmoUsername: enabled.venmo ? normalizeVenmoUsername(input.venmoUsername) : null,
    cashAppCashtag: enabled.cash_app ? normalizeCashAppCashtag(input.cashAppCashtag) : null,
    zelleEmail: enabled.zelle ? normalizeOptionalText(input.zelleEmail)?.toLowerCase() ?? null : null,
    zellePhone: enabled.zelle ? normalizeOptionalText(input.zellePhone)?.replace(/[^\d+]/g, "") ?? null : null,
  };
}

type PaymentMethodMember = {
  id: number;
  displayName: string | null;
  username: string | null;
  paypalEmail: string | null;
  venmoUsername: string | null;
  cashAppCashtag: string | null;
  zelleEmail: string | null;
  zellePhone: string | null;
};

async function getPaymentMethodMembers(db: Awaited<ReturnType<typeof requireDb>>, memberIds: number[]) {
  return db.select({
    id: users.id,
    displayName: userProfiles.displayName,
    username: users.username,
    paypalEmail: users.paypalEmail,
    venmoUsername: users.venmoUsername,
    cashAppCashtag: users.cashAppCashtag,
    zelleEmail: users.zelleEmail,
    zellePhone: users.zellePhone,
  }).from(users).leftJoin(userProfiles, eq(userProfiles.userId, users.id)).where(inArray(users.id, memberIds));
}

function memberPaymentDisplayName(member: PaymentMethodMember | undefined) {
  return member?.displayName?.trim() || member?.username?.trim() || "Your trade partner";
}

// The R2 adapter enforces decoded per-kind limits (10MB listing, 5MB avatar).
// This ceiling stops an oversized base64 request before its payload is decoded.
export const MAX_PUBLIC_MEDIA_BASE64_CHARS = 13_981_020;

export const uploadedImageSchema = z.object({
  name: z.string().max(200).optional().default(''),
  type: z.string().max(120).optional().default(''),
  contentBase64: z.string().min(1).max(MAX_PUBLIC_MEDIA_BASE64_CHARS).optional(), // Optional: only present for new uploads
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
  publisher: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  scottNumber: z.string().max(50).optional(),
  mintOrUsed: z.string().max(30).optional(),
  stampGrade: z.string().max(30).optional(),
  editionEra: z.string().max(80).optional(),
  finishVariant: z.string().max(80).optional(),
  signer: z.string().max(160).optional(),
  verifiedMerchantsOnly: z.boolean().optional(),
  locationSort: z.boolean().optional(),
  distanceMiles: z.number().positive().max(500).optional(),
});

const memberSearchSchema = z.object({
  query: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  categories: z.array(z.enum(collectibleCategories)).max(collectibleCategories.length).optional(),
  verifiedMerchantsOnly: z.boolean().optional(),
  minRating: z.number().min(0).max(5).optional(),
  minReviewCount: z.number().int().min(0).max(100000).optional(),
  minCompletedTrades: z.number().int().min(0).max(100000).optional(),
  activeListingsOnly: z.boolean().optional(),
  listingValueMin: z.number().min(0).max(100000000).optional(),
  listingValueMax: z.number().min(0).max(100000000).optional(),
  memberSince: z.enum(["past_year", "past_three_years", "longstanding"]).optional(),
  distanceMiles: z.number().positive().max(500).optional(),
  sort: z.enum(["best_match", "best_rated", "most_trades", "most_listings", "newest", "nearest"]).optional(),
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
  testAI: testAIRouter,
  r2Media: r2MediaRouter,
  membership: membershipRouter,
  billing: billingRouter,
  launchUpdates: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().trim().email().max(320) }))
      .mutation(async ({ ctx, input }) => {
        const source = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
        const key = `${source}:${normalizeLaunchUpdateEmail(input.email)}`;
        if (!isLaunchUpdateRequestAllowed(key)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before submitting another email-update request." });
        }
        return subscribeToLaunchUpdates(input.email);
      }),
  }),
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
          email: z.string().email(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const clientAddress = ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown";
        if (!isRecoveryRequestAllowed(`signup:${clientAddress}`, Date.now(), 5)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before creating another account." });
        }
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

	        const ipqsHistory = await getIpqsEmailHistory(input.email);

	        const passwordHash = await hashPassword(input.password);
	        const userId = await createUser({
	          username: input.username,
	          passwordHash,
	          displayName: input.displayName,
	          email: input.email,
	        });

	        if (ipqsHistory.available && ipqsHistory.underOneYear) {
	          await createPendingEmailHistoryApproval(userId, ipqsHistory.firstSeenAt);
	        }

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
    /**
     * Send a 6-digit SMS verification code for an authenticated new member.
     */
    sendPhoneCode: protectedProcedure
      .input(z.object({ phone: z.string().min(7).max(25) }))
      .mutation(async ({ input }) => {
        const e164 = normalizePhone(input.phone);
        if (!e164) {
          throw new Error("Please enter a valid phone number (e.g. 555-123-4567).");
        }
        const result = await sendVerificationCode(e164);
        if (!result.ok) {
          throw new Error(result.error);
        }
        return { success: true, sentTo: maskPhone(e164) };
      }),
    sendEmailCode: protectedProcedure
      .input(z.object({}))
      .mutation(async ({ ctx }) => {
        const db = await requireDb();
        const [account] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        const email = account?.email ? normalizeRecoveryEmail(account.email) : "";
        if (!email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Your account does not have a recovery email address." });
        }
        if (!isRecoveryRequestAllowed(`setup-email:${ctx.user.id}`)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before requesting another email code." });
        }
        const code = createSixDigitCode();
        await createEmailOtp(email, code, new Date(Date.now() + 10 * 60 * 1000));
        const sent = await sendAccountEmailVerificationCode({ recipientEmail: email, code });
        if (!sent) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not send a verification email. Please try again later." });
        }
        return { success: true };
      }),
    verifyEmailCode: protectedProcedure
      .input(z.object({ code: z.string().min(4).max(10) }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const [account] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        const email = account?.email ? normalizeRecoveryEmail(account.email) : "";
        if (!email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Your account does not have a recovery email address." });
        }
        const otp = await getEmailOtp(email);
        const now = Date.now();
        if (!otp || new Date(otp.expiresAt).getTime() <= now || otp.attempts >= 5) {
          await deleteEmailOtp(email);
          throw new TRPCError({ code: "BAD_REQUEST", message: "This email code is no longer valid. Request a new code." });
        }
        const enteredCode = input.code.replace(/\D/g, "");
        if (!enteredCode || !timingSafeTextEquals(enteredCode, otp.otp)) {
          await incrementEmailOtpAttempts(email);
          throw new TRPCError({ code: "BAD_REQUEST", message: "That email code is incorrect. Please check and try again." });
        }
        await updateProfile(
          { id: ctx.user.id, name: ctx.user.name },
          {
            displayName: (ctx.user as any).displayName || (ctx.user as any).username || ctx.user.name || `Collector ${ctx.user.id}`,
            contactEmail: email,
            emailVerified: true,
          },
        );
        await deleteEmailOtp(email);
        return { verified: true, email };
      }),
    /**
     * Check the code the user typed against Twilio Verify.
     * Returns { verified: true } only when Twilio reports the code approved.
     */
    verifyPhoneCode: protectedProcedure
      .input(
        z.object({
          phone: z.string().min(7).max(25),
          code: z.string().min(4).max(10),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const e164 = normalizePhone(input.phone);
        if (!e164) {
          throw new Error("Please enter a valid phone number.");
        }
        const digitsOnly = input.code.replace(/\D/g, "");
        if (!digitsOnly) {
          throw new Error("Please enter the code from the text message.");
        }
        const result = await checkVerificationCode(e164, digitsOnly);
        if (!result.ok) {
          throw new Error(result.error);
        }
        if (!result.approved) {
          throw new Error("That code is incorrect. Please check and try again.");
        }
        const db = await requireDb();
        const existingProfile = await db
          .select({ acceptedTerms: userProfiles.acceptedTerms })
          .from(userProfiles)
          .where(eq(userProfiles.userId, ctx.user.id))
          .limit(1);
        await updateProfile(
          { id: ctx.user.id, name: ctx.user.name },
          {
            displayName: (ctx.user as any).displayName || (ctx.user as any).username || ctx.user.name || `Collector ${ctx.user.id}`,
            contactPhone: e164,
            phoneVerified: true,
          },
        );
        return { verified: true, phone: e164 };
      }),
    signin: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const clientAddress = ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown";
        if (!isRecoveryRequestAllowed(`signin:${clientAddress}:${input.username.toLowerCase()}`, Date.now(), 10)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait and try again." });
        }
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

        if ((user as any).isAccountClosed === 1) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This account has been closed. Please contact Tradebilia support if you believe this is an error.',
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

        // The cookie remains the normal session transport. Returning the signed
        // token lets the client use the already-supported Authorization fallback
        // only when a mobile browser refuses to retain the Set-Cookie response.
        return {
          success: true,
          userId: user.id,
          sessionToken,
          user: {
            id: user.id,
            name: user.name ?? user.username ?? "Collector",
            username: user.username ?? null,
            role: user.role ?? "user",
            displayName: (user as any).displayName ?? user.name ?? user.username ?? "Collector",
            avatarUrl: (user as any).avatarUrl ?? null,
          },
        };
      }),
    requestPasswordRecovery: publicProcedure
      .input(z.object({ email: z.string().email().max(320) }))
      .mutation(async ({ input }) => {
        const email = normalizeRecoveryEmail(input.email);
        const genericResult = { success: true };
        if (!isRecoveryRequestAllowed(`password-email:${email}`)) return genericResult;

        const db = await requireDb();
        const [account] = await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!account?.email) return genericResult;
        const [profile] = await db
          .select({ contactEmail: userProfiles.contactEmail, emailVerified: userProfiles.emailVerified })
          .from(userProfiles)
          .where(eq(userProfiles.userId, account.id))
          .limit(1);
        if (profile?.emailVerified !== 1 || normalizeRecoveryEmail(profile.contactEmail || "") !== email) return genericResult;

        const token = createOpaqueRecoveryToken();
        await deletePasswordResetTokensForUser(account.id);
        await createPasswordResetToken(account.id, hashRecoveryToken(token), new Date(Date.now() + PASSWORD_RECOVERY_TOKEN_TTL_MS));
        await sendPasswordRecoveryEmail({ recipientEmail: email, token });
        return genericResult;
      }),
    requestPhonePasswordRecovery: publicProcedure
      .input(z.object({ phone: z.string().min(7).max(25) }))
      .mutation(async ({ input }) => {
        const phone = normalizePhone(input.phone);
        const genericResult = { success: true };
        if (!phone || !isRecoveryRequestAllowed(`password-phone:${phone}`)) return genericResult;
        const db = await requireDb();
        const [profile] = await db
          .select({ phoneVerified: userProfiles.phoneVerified })
          .from(userProfiles)
          .where(and(eq(userProfiles.contactPhone, phone), eq(userProfiles.phoneVerified, 1)))
          .limit(1);
        if (profile?.phoneVerified === 1) {
          await sendVerificationCode(phone);
        }
        return genericResult;
      }),
    completePhonePasswordRecovery: publicProcedure
      .input(z.object({ phone: z.string().min(7).max(25), code: z.string().min(4).max(10), newPassword: z.string().min(8).max(255) }))
      .mutation(async ({ input }) => {
        const phone = normalizePhone(input.phone);
        if (!phone || !isValidPassword(input.newPassword) || !isRecoveryRequestAllowed(`password-phone-verify:${phone}`)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "We could not complete password recovery. Request a new verification code and try again." });
        }
        const db = await requireDb();
        const [profile] = await db
          .select({ userId: userProfiles.userId })
          .from(userProfiles)
          .where(and(eq(userProfiles.contactPhone, phone), eq(userProfiles.phoneVerified, 1)))
          .limit(1);
        const result = await checkVerificationCode(phone, input.code.replace(/\D/g, ""));
        if (!profile || !result.ok || !result.approved) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "We could not complete password recovery. Request a new verification code and try again." });
        }
        await updateUserPassword(profile.userId, await hashPassword(input.newPassword));
        await deletePasswordResetTokensForUser(profile.userId);
        return { success: true };
      }),
    completePasswordRecovery: publicProcedure
      .input(z.object({ token: z.string().min(20).max(255), newPassword: z.string().min(8).max(255) }))
      .mutation(async ({ input }) => {
        const tokenHash = hashRecoveryToken(input.token);
        if (!isValidPassword(input.newPassword) || !isRecoveryRequestAllowed(`password-token:${tokenHash}`)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This password recovery link is no longer valid." });
        }
        const resetToken = await getPasswordResetToken(tokenHash);
        if (!resetToken || isRecoveryTokenExpired(resetToken.expiresAt)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This password recovery link is no longer valid." });
        }
        await updateUserPassword(resetToken.userId, await hashPassword(input.newPassword));
        await deletePasswordResetTokensForUser(resetToken.userId);
        return { success: true };
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
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
    search: publicProcedure.input(memberSearchSchema.optional()).query(({ ctx, input }) => {
      return searchMembers(input ?? {}, ctx.user ? { id: ctx.user.id, role: ctx.user.role } : null);
    }),
    searchNearby: protectedProcedure.input(memberSearchSchema).query(({ ctx, input }) => {
      return searchMembers(input, { id: ctx.user.id, role: ctx.user.role });
    }),
    startDirectMessageThread: protectedProcedure
      .input(z.object({ recipientId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.recipientId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot message yourself." });
        }
        const db = await requireDb();
        const recipientProfile = await db
          .select({ receiveContactRequests: userProfiles.receiveContactRequests })
          .from(userProfiles)
          .where(eq(userProfiles.userId, input.recipientId))
          .limit(1);
        if (recipientProfile[0]?.receiveContactRequests === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This collector is not accepting contact requests." });
        }
        const { threadId } = await getOrCreateDirectMessageThread(db as any, {
          participantAId: ctx.user.id,
          participantBId: input.recipientId,
        });
        return { threadId, recipientId: input.recipientId };
      }),
  }),
  accountClosure: router({
    getMyRequest: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return getMyAccountClosureRequest(db as any, ctx.user.id);
    }),
    request: protectedProcedure
      .input(z.object({ memberNote: z.string().trim().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        return requestAccountClosure(db as any, ctx.user.id, input.memberNote);
      }),
    adminList: protectedProcedure
      .input(z.object({ status: z.enum(["pending_review", "closed", "declined", "withdrawn"]).optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await requireDb();
        return getAccountClosureRequestsForAdmin(db as any, input?.status);
      }),
    adminAudit: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await requireDb();
        return getAccountClosureAudit(db as any, input.userId);
      }),
    adminReview: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        decision: z.enum(["approve_close", "decline"]),
        adminNote: z.string().trim().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await requireDb();
        return reviewAccountClosureRequest(db as any, {
          requestId: input.requestId,
          administratorId: ctx.user.id,
          decision: input.decision,
          adminNote: input.adminNote,
        });
      }),
  }),
  market: router({
    feed: publicProcedure.input(listingFiltersSchema.optional()).query(({ ctx, input }) => {
      return getMarketplaceFeed(input ?? {}, ctx.user?.id ?? null);
    }),
    siteStatistics: publicProcedure.query(() => {
      return getSiteStatistics();
    }),
    getViewerTimeZone: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const [profile] = await db
        .select({ contactState: userProfiles.contactState, contactCountry: userProfiles.contactCountry })
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.user.id))
        .limit(1);
      return { timeZone: resolveProfileTimeZone(profile) };
    }),
    topHighestValueItems: publicProcedure.query(({ ctx }) => {
      return getTopHighestValueItems(ctx.user?.id ?? null);
    }),
    getVerifiedMerchants: publicProcedure.query(async () => {
      const db = await requireDb();
      const [rows] = await db.execute(
        sql`SELECT
          u.id,
          u.merchantVerifiedAt,
          up.displayName,
          up.avatarUrl,
          up.storeName,
          up.storeDescription,
          up.businessWebsite,
          up.contactTown,
          up.contactState,
          up.contactCountry,
          (SELECT COUNT(*) FROM listings l WHERE l.ownerId = u.id AND l.status = 'active' AND l.isActive = 1) as itemsListed
        FROM users u
        LEFT JOIN userProfiles up ON up.userId = u.id
        WHERE u.merchantVerified = 1
          AND ${isPublicMemberEligible(sql`u.id`)}
        ORDER BY u.merchantVerifiedAt DESC`
      );
      return Array.isArray(rows) ? rows as any[] : [];
    }),
    getUserProfile: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const db = await requireDb();
        const [user] = await db.execute(
          sql`SELECT
            u.id,
            u.username,
            u.displayName,
            u.avatarUrl,
            u.role,
            u.createdAt,
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
            u.facebookPicture,
            u.facebookLocation,
            u.facebookLink,
            u.facebookLikes,
            u.facebookConnectedAt,
            u.linkedinId,
            u.linkedinName,
            u.linkedinPicture,
            u.linkedinHeadline,
            u.linkedinProfileUrl,
            u.linkedinConnectedAt,
            u.merchantVerified,
            CASE WHEN u.lastActivityAt IS NOT NULL AND u.lastActivityAt >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END AS isOnline
          FROM users u
          WHERE u.id = ${input.userId}`
        );

        // db.execute returns [rows, fields] — rows is the array of results
        const userRow = Array.isArray(user) ? (user as any[])[0] : user;

        if (!userRow) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        const [profileRows] = await db.execute(
          sql`SELECT displayName, avatarUrl, bio, contactTown, contactState, preferredCategories, connectedAccounts, showProfile, hideInventoryValue FROM userProfiles WHERE userId = ${input.userId}`
        );
        const profileRow = Array.isArray(profileRows) ? (profileRows as any[])[0] : profileRows;
        const viewerMayBypassProfilePrivacy = ctx.user?.id === input.userId || ctx.user?.role === "admin";
        if (profileRow?.showProfile === 0 && !viewerMayBypassProfilePrivacy) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Profile not available" });
        }
        const shouldHideInventoryValue = profileRow?.hideInventoryValue === 1 && !viewerMayBypassProfilePrivacy;

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

        const etsyVerification = getPublicEtsyVerification(profileRow?.connectedAccounts);

        return {
          user: { ...userRow, ...etsyVerification },
          profile: profileRow ? {
            displayName: profileRow.displayName,
            avatarUrl: profileRow.avatarUrl,
            bio: profileRow.bio,
            contactTown: profileRow.contactTown,
            contactState: profileRow.contactState,
            preferredCategories: profileRow.preferredCategories,
          } : null,
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
          recentListings: shouldHideInventoryValue
            ? recentListingsArr.map((listing: any) => ({ ...listing, estimatedValue: null }))
            : recentListingsArr,
        };
      }),
    search: publicProcedure
      .input(
        z.object({
          query: z.string().max(100),
          category: z.enum(collectibleCategories).optional(),
          condition: z.enum(itemConditions).optional(),
          valueMin: z.number().min(0).optional(),
          valueMax: z.number().min(0).optional(),
          verifiedMerchantsOnly: z.boolean().optional(),
          sort: z.enum(["newest", "title", "value_low_high", "value_high_low"]).optional(),
          locationSort: z.boolean().optional(),
          distanceMiles: z.number().positive().optional(),
          limit: z.number().int().min(1).max(48).optional(),
          offset: z.number().int().min(0).max(10000).optional(),
        }),
      )
      .query(({ ctx, input }) => {
        return getMarketplaceFeed(
          {
            keyword: input.query,
            category: input.category,
            condition: input.condition,
            valueMin: input.valueMin,
            valueMax: input.valueMax,
            verifiedMerchantsOnly: input.verifiedMerchantsOnly,
            sort: input.sort,
            locationSort: input.locationSort,
            distanceMiles: input.distanceMiles,
            limit: input.limit,
            offset: input.offset,
          },
          ctx.user?.id ?? null,
        );
      }),
    dashboard: protectedProcedure.query(({ ctx }) => {
      return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
    }),
    contactIdentity: protectedProcedure.query(({ ctx }) => {
      return getTradebiliaContactIdentity({ id: ctx.user.id, name: ctx.user.name });
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
          .select({
            acceptedTerms: userProfiles.acceptedTerms,
            contactEmail: userProfiles.contactEmail,
            emailVerified: userProfiles.emailVerified,
            contactPhone: userProfiles.contactPhone,
            phoneVerified: userProfiles.phoneVerified,
          })
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
          .limit(1);
        const isFirstTimeSetup = !existingProfile[0] || !existingProfile[0].acceptedTerms;

        if (isFirstTimeSetup) {
          try {
            const [account] = await db0
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);
            validateFirstTimeSetupRequirements(input, {
              ...existingProfile[0],
              accountEmail: account?.email,
            });
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error instanceof Error ? error.message : "Account setup requirements were not met.",
            });
          }
        }

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
        
        // Merchant/store fields are locked for non-admins EXCEPT during first-time setup
        if (!isAdmin && !isFirstTimeSetup) {
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
            contactEmail: canWriteLockedFields ? (existingProfile[0]?.contactEmail ?? undefined) : undefined,
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
            // A new member may submit merchant information as a verification request.
            // This does not set the separately administered merchantVerified flag.
            isMerchant: canWriteLockedFields ? input.isMerchant : undefined,
            storeName: canWriteLockedFields ? input.storeName : undefined,
            businessLicense: canWriteLockedFields ? input.businessLicense : undefined,
            taxId: canWriteLockedFields ? input.taxId : undefined,
            storeDescription: canWriteLockedFields ? input.storeDescription : undefined,
            businessAddress: canWriteLockedFields ? input.businessAddress : undefined,
            businessPhone: canWriteLockedFields ? input.businessPhone : undefined,
            businessEmail: canWriteLockedFields ? input.businessEmail : undefined,
            businessWebsite: canWriteLockedFields ? input.businessWebsite : undefined,
            preferredCategories: input.preferredCategories,
            notificationPreferences: input.notificationPreferences ? JSON.stringify(input.notificationPreferences) : (undefined as any),
            // Do not trust browser-supplied verification flags. A first-time setup can
            // only finish after trusted verification procedures persisted matching contacts.
            emailVerified: isFirstTimeSetup ? true : undefined,
            phoneVerified: isFirstTimeSetup ? true : undefined,
          },
        );
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
          connectedAccounts: z.array(z.enum(["ebay", "paypal", "facebook", "linkedin", "whatnot", "etsy"])),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Store integrations in userProfiles while preserving Etsy metadata.
        const db = await requireDb();
        const existing = await db.select({ connectedAccounts: userProfiles.connectedAccounts }).from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
        let etsy: unknown;
        try {
          const parsed = existing[0]?.connectedAccounts ? JSON.parse(existing[0].connectedAccounts) : null;
          etsy = Array.isArray(parsed) ? undefined : parsed?.etsy;
        } catch {
          etsy = undefined;
        }
        await db.update(userProfiles).set({
          connectedAccounts: JSON.stringify(etsy ? { accounts: input.connectedAccounts, etsy } : input.connectedAccounts),
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
          messages: z.object({ email: z.boolean(), text: z.boolean() }),
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
            messages: input.messages,
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
	      .mutation(async ({ ctx, input }) => {
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
        
	        await requireMarketplaceApproval(ctx.user.id);
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
	      .mutation(async ({ ctx, input }) => {
	        if ((ctx.user as any).isSuspended === 1) {
	          throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account is suspended. You cannot initiate trades while suspended.' });
	        }
	        await requireMarketplaceApproval(ctx.user.id);
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
	        if (input.action === "counter") await requireMarketplaceApproval(ctx.user.id);
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
        const reporter = await getTradebiliaContactIdentity({ id: ctx.user.id, name: ctx.user.name });
        const delivered = await notifyOwner({
          title: `Tradebilia report submitted: ${input.concernType}`,
          content: [
            `Reporter: ${reporter.displayName}`,
            `Reporter user ID: ${ctx.user.id}`,
            `Reporter Tradebilia account email: ${reporter.contactEmail || "Not set"}`,
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
        const referrer = await getTradebiliaContactIdentity({ id: ctx.user.id, name: ctx.user.name });
        
        try {
          await createReferralRequest({
            referrerId: ctx.user.id,
            referrerEmail: referrer.contactEmail,
            referrerFirstName: referrer.firstName,
            referrerLastName: referrer.lastName,
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
          subcategory: z.string().max(64).nullable().optional(),
          title: z.string().min(3).max(255),
          content: z.string().min(1).max(5000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const allowed = input.category in forumTaxonomy
          ? [...forumTaxonomy[input.category as keyof typeof forumTaxonomy], forumParentLevelSubcategory]
          : [];
        if (input.category !== "general" && !allowed.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid forum category." });
        if (input.subcategory && input.category !== "general" && !allowed.includes(input.subcategory as never)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid item-type subcategory." });
        }
        try {
          return await createForumPost({ id: ctx.user.id, name: ctx.user.name, openId: ctx.user.openId }, input);
        } catch (error) {
          console.error("[Forum] Topic creation failed", { userId: ctx.user.id, error });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not create this topic right now. Please refresh the page and try again." });
        }
      }),
    uploadForumPostImage: protectedProcedure
      .input(z.object({
        postId: z.number().int().positive(),
        fileName: z.string().min(1).max(160),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
        dataBase64: z.string().min(1).max(8_500_000),
        altText: z.string().max(180).optional(),
        sortOrder: z.number().int().min(0).max(5),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
        if (buffer.byteLength > 6 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Each forum photo must be 6 MB or smaller." });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
        const uploaded = await storagePut(`forum/${ctx.user.id}/${input.postId}/${safeName}`, buffer, input.mimeType);
        return addForumPostAttachment({ postId: input.postId, userId: ctx.user.id, fileKey: uploaded.key, imageUrl: uploaded.url, altText: input.altText, sortOrder: input.sortOrder });
      }),
    createForumReport: protectedProcedure
      .input(z.object({ postId: z.number().int().positive(), reason: z.string().min(3).max(80), details: z.string().max(2000).optional() }))
      .mutation(({ ctx, input }) => createForumReport(ctx.user.id, input)),
    toggleForumFollow: protectedProcedure
      .input(z.object({ postId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => toggleForumFollow(ctx.user.id, input.postId)),
    isFollowingForumPost: protectedProcedure
      .input(z.object({ postId: z.number().int().positive() }))
      .query(({ ctx, input }) => isFollowingForumPost(ctx.user.id, input.postId)),
    getMyForumNotifications: protectedProcedure.query(({ ctx }) => getMyForumNotifications(ctx.user.id)),
    markForumNotificationRead: protectedProcedure
      .input(z.object({ notificationId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => markForumNotificationRead(ctx.user.id, input.notificationId)),
    moderateForumPost: protectedProcedure
      .input(z.object({ postId: z.number().int().positive(), action: z.enum(["remove", "restore", "pin", "unpin"]), reason: z.string().max(2000).optional() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return moderateForumPost(ctx.user.id, input);
      }),
    getForumModerationQueue: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getForumReportsForAdmin();
    }),
    reviewForumReport: protectedProcedure
      .input(z.object({ reportId: z.number().int().positive(), action: z.enum(["dismiss", "remove", "restore"]), note: z.string().max(2000).optional() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return reviewForumReport(ctx.user.id, input);
      }),
    updateForumPost: protectedProcedure
      .input(z.object({
        postId: z.number().int().positive(),
        title: z.string().min(3).max(255),
        content: z.string().min(10).max(5000),
      }))
      .mutation(({ ctx, input }) => updateForumPost(ctx.user.id, input)),
    deleteForumPost: protectedProcedure
      .input(z.object({ postId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => deleteForumPost(ctx.user.id, input.postId)),
    getForumPosts: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          subcategory: z.string().nullable().optional(),
          searchQuery: z.string().max(120).optional(),
          activityFilter: z.enum(["all", "unanswered"]).default("all"),
          sortBy: z.enum(["activity", "newest", "popular", "replies"]).default("activity"),
        }),
      )
      .query(({ input }) => {
        return getForumPosts(input.category, input.sortBy, input.subcategory, input.searchQuery, input.activityFilter);
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
          listingId: z.number().int().positive().nullable().optional(),
          parentReplyId: z.number().int().positive().nullable().optional(),
          content: z.string().min(1).max(2000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await addForumReply({ id: ctx.user.id, name: ctx.user.name }, input);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (/failed query|unknown column|forumrepl(?:y|ies)|database/i.test(message)) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not post your reply right now. Please refresh and try again." });
          }
          throw error;
        }
      }),
    uploadForumReplyImage: protectedProcedure
      .input(z.object({
        replyId: z.number().int().positive(),
        fileName: z.string().min(1).max(160),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"]),
        dataBase64: z.string().min(1).max(14_000_000),
        altText: z.string().max(180).optional(),
        sortOrder: z.number().int().min(0).max(5),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
        if (buffer.byteLength > 10 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Each forum image or video must be 10 MB or smaller." });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
        const uploaded = await storagePut(`forum/${ctx.user.id}/replies/${input.replyId}/${safeName}`, buffer, input.mimeType);
        return addForumReplyAttachment({ replyId: input.replyId, userId: ctx.user.id, fileKey: uploaded.key, imageUrl: uploaded.url, mimeType: input.mimeType, altText: input.altText, sortOrder: input.sortOrder });
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
          evidence: z.string().max(2000).optional(),
          listingReference: z.string().max(240).optional(),
          contactEmail: z.string().email().max(320).optional(),
          attachments: z.array(z.object({ key: z.string().max(500), url: z.string().max(700), name: z.string().max(160), type: z.string().max(120), size: z.number().int().positive().max(10 * 1024 * 1024) })).max(5).default([]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.reportedUserId === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot report yourself' });
        }
        if (input.attachments.some((attachment) => !ownsReportAttachment(ctx.user.id, attachment))) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'An evidence attachment does not belong to your report.' });
        }
        const reporter = await getTradebiliaContactIdentity({ id: ctx.user.id, name: ctx.user.name });
        return submitUserReport({
          reportedUserId: input.reportedUserId,
          reporterUserId: ctx.user.id,
          reason: input.reason,
          description: input.description,
          evidence: serializeReportEvidence({ notes: input.evidence, listingReference: input.listingReference, contactEmail: reporter.contactEmail || input.contactEmail, attachments: input.attachments }),
        });
      }),
    uploadReportEvidence: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(160), type: z.string().min(1).max(120), contentBase64: z.string().min(1).max(14_000_000) }))
      .mutation(({ ctx, input }) => uploadReportEvidence(ctx.user.id, input)),
    getMyReports: protectedProcedure.query(({ ctx }) => getReportsByReporter(ctx.user.id)),
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
        const db = await requireDb();
        const recipientProfile = await db
          .select({ receiveContactRequests: userProfiles.receiveContactRequests })
          .from(userProfiles)
          .where(eq(userProfiles.userId, input.recipientId))
          .limit(1);
        if (recipientProfile[0]?.receiveContactRequests === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This collector is not accepting contact requests." });
        }
        const senderDisplayName = await getCommunicationDisplayName(ctx.user.id);
        const result = await sendItemInquiry({ id: ctx.user.id, name: ctx.user.name }, input);

        // Send email notification to recipient if messages.email enabled (fire-and-forget)
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
              senderName: senderDisplayName,
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
      .query(async ({ input, ctx }) => {
        return getRepliesByInquiry(input.inquiryId, ctx.user.id);
      }),
    deleteInquiry: protectedProcedure
      .input(z.object({ inquiryId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await deleteInquiry(input.inquiryId, ctx.user.id);
        return { success: true };
      }),
    getDeleted: protectedProcedure
      .input(z.object({ cacheBust: z.number().int().nonnegative() }).optional())
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
        const { threadId } = await persistDirectMessage(db as any, {
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          subject: input.subject,
          body: input.body,
        });

        // Send email notification to recipient if they have messages.email enabled (fire-and-forget)
        const senderDisplayName = await getCommunicationDisplayName(ctx.user.id);
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
              senderName: senderDisplayName,
              subject: input.subject,
              bodyPreview: input.body,
            }).catch(err => console.warn('[Email] Failed to send new message notification:', err));
          }
        }

        return { threadId, recipientId: input.recipientId };
      }),

    getDirectMessageThreads: protectedProcedure
      .input(z.object({ archived: z.boolean().optional().default(false) }).optional())
      .query(async ({ ctx, input }) => {
        const db = await requireDb();
        const archiveFilter = input?.archived
          ? sql`((t.participantAId = ${ctx.user.id} AND t.participantAArchivedAt IS NOT NULL)
            OR (t.participantBId = ${ctx.user.id} AND t.participantBArchivedAt IS NOT NULL))`
          : sql`((t.participantAId = ${ctx.user.id} AND t.participantAArchivedAt IS NULL)
            OR (t.participantBId = ${ctx.user.id} AND t.participantBArchivedAt IS NULL))`;
        const [rows] = await db.execute(
          sql`SELECT
            t.id as threadId,
            t.lastMessageAt,
            -- counterpart info
            CASE WHEN t.participantAId = ${ctx.user.id} THEN t.participantBId ELSE t.participantAId END as counterpartId,
            up.displayName as profileDisplayName,
            u.username as accountName,
            up.avatarUrl as counterpartAvatarUrl,
            -- latest message
            (SELECT dm2.body FROM directMessages dm2 WHERE dm2.threadId = t.id ORDER BY dm2.createdAt DESC LIMIT 1) as latestBody,
            (SELECT dm2.subject FROM directMessages dm2 WHERE dm2.threadId = t.id AND NULLIF(TRIM(dm2.subject), '') IS NOT NULL ORDER BY dm2.createdAt ASC LIMIT 1) as latestSubject,
            (SELECT dm2.senderId FROM directMessages dm2 WHERE dm2.threadId = t.id ORDER BY dm2.createdAt DESC LIMIT 1) as latestSenderId,
            -- unread count for current user
            (SELECT COUNT(*) FROM directMessages dm3 WHERE dm3.threadId = t.id AND dm3.senderId != ${ctx.user.id} AND dm3.isReadByRecipient = 0) as unreadCount
          FROM directMessageThreads t
          JOIN users u ON u.id = CASE WHEN t.participantAId = ${ctx.user.id} THEN t.participantBId ELSE t.participantAId END
          LEFT JOIN userProfiles up ON up.userId = u.id
          WHERE (t.participantAId = ${ctx.user.id} OR t.participantBId = ${ctx.user.id})
            AND ${archiveFilter}
          ORDER BY t.lastMessageAt DESC`
        );
        const threadRows = Array.isArray(rows) ? rows : [];
        return threadRows.map((row: any) => ({
          ...row,
          counterpartName: resolveDirectMessageDisplayName(
            row.profileDisplayName,
            row.accountName,
            Number(row.counterpartId),
          ),
        }));
      }),

    getDirectMessages: protectedProcedure
      .input(z.object({ threadId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await requireDb();
        // Archived threads remain readable from the caller's personal archive.
        const thread = await db
          .select({ id: directMessageThreads.id })
          .from(directMessageThreads)
          .where(and(
            eq(directMessageThreads.id, input.threadId),
            or(eq(directMessageThreads.participantAId, ctx.user.id), eq(directMessageThreads.participantBId, ctx.user.id)),
          ))
          .limit(1);
        if (!thread.length) throw new TRPCError({ code: 'FORBIDDEN', message: 'Thread not found.' });
        const msgs = await db
          .select({
            id: directMessages.id,
            threadId: directMessages.threadId,
            senderId: directMessages.senderId,
            subject: directMessages.subject,
            body: directMessages.body,
            isReadByRecipient: directMessages.isReadByRecipient,
            createdAt: directMessages.createdAt,
            senderProfileDisplayName: userProfiles.displayName,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
            senderAccountName: users.name,
          })
          .from(directMessages)
          .innerJoin(users, eq(directMessages.senderId, users.id))
          .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
          .where(eq(directMessages.threadId, input.threadId))
          .orderBy(directMessages.createdAt);
        // Mark all messages from counterpart as read
        await db.execute(
          sql`UPDATE directMessages SET isReadByRecipient = 1 WHERE threadId = ${input.threadId} AND senderId != ${ctx.user.id} AND isReadByRecipient = 0`
        );
        return msgs.map(message => ({
          ...message,
          senderName: resolveDirectMessageDisplayName(
            message.senderProfileDisplayName,
            message.senderUsername || message.senderDisplayName || message.senderAccountName,
            message.senderId,
          ),
        }));
      }),

    replyDirectMessage: protectedProcedure
      .input(z.object({ threadId: z.number().int().positive(), body: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const thread = await db
          .select({
            id: directMessageThreads.id,
            participantAId: directMessageThreads.participantAId,
            participantBId: directMessageThreads.participantBId,
          })
          .from(directMessageThreads)
          .where(and(
            eq(directMessageThreads.id, input.threadId),
            or(eq(directMessageThreads.participantAId, ctx.user.id), eq(directMessageThreads.participantBId, ctx.user.id))
          ))
          .limit(1);
        if (!thread.length) throw new TRPCError({ code: 'FORBIDDEN', message: 'Thread not found.' });
        const originalMessage = await db
          .select({ subject: directMessages.subject })
          .from(directMessages)
          .where(eq(directMessages.threadId, input.threadId))
          .orderBy(asc(directMessages.createdAt))
          .limit(1);
        const replySubject = originalMessage[0]?.subject?.trim() || 'Direct message';
        await db.insert(directMessages).values({
          threadId: input.threadId,
          senderId: ctx.user.id,
          subject: replySubject,
          body: input.body,
          isReadByRecipient: 0,
        });
        await db.execute(sql`UPDATE directMessageThreads SET lastMessageAt = NOW(), participantAArchivedAt = NULL, participantBArchivedAt = NULL WHERE id = ${input.threadId}`);

        // Send email notification to the other participant if messages.email enabled (fire-and-forget)
        const senderDisplayName = await getCommunicationDisplayName(ctx.user.id);
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
              senderName: senderDisplayName,
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
        // Archive only the caller's inbox view; shared history remains for the other participant and administrators.
        const thread = await db
          .select({ id: directMessageThreads.id, participantAId: directMessageThreads.participantAId, participantBId: directMessageThreads.participantBId })
          .from(directMessageThreads)
          .where(and(
            eq(directMessageThreads.id, input.threadId),
            or(eq(directMessageThreads.participantAId, ctx.user.id), eq(directMessageThreads.participantBId, ctx.user.id))
        ))
        .limit(1);
        if (!thread.length) throw new TRPCError({ code: 'FORBIDDEN', message: 'Thread not found.' });
        await db
          .update(directMessageThreads)
          .set(thread[0].participantAId === ctx.user.id
            ? { participantAArchivedAt: sql`NOW()` }
            : { participantBArchivedAt: sql`NOW()` })
          .where(eq(directMessageThreads.id, input.threadId));
        return { success: true, archived: true };
      }),

    getUnreadDirectMessageCount: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await requireDb();
        const [rows] = await db.execute(
          sql`SELECT COUNT(*) as count FROM directMessages dm
          JOIN directMessageThreads t ON t.id = dm.threadId
          WHERE (t.participantAId = ${ctx.user.id} OR t.participantBId = ${ctx.user.id})
          AND ((t.participantAId = ${ctx.user.id} AND t.participantAArchivedAt IS NULL)
            OR (t.participantBId = ${ctx.user.id} AND t.participantBArchivedAt IS NULL))
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
            AND ${isPublicMemberEligible(sql`tp.requesterId`)}
            AND ${isPublicMemberEligible(sql`tp.recipientId`)}
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
            AND ${isPublicMemberEligible(sql`tp.requesterId`)}
            AND ${isPublicMemberEligible(sql`tp.recipientId`)}
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
      .input(z.object({ state: z.string().optional() }).optional())
      .query(({ ctx }) => {
        const state = createProviderOauthState();
        setProviderOauthStateCookie(ctx.res, "ebay", state);
        return getEbayAuthUrl(state);
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
      .input(z.object({ state: z.string().optional() }).optional())
      .query(async ({ ctx }) => {
        const { getFacebookAuthUrl } = await import('./_core/facebook');
        const state = createProviderOauthState();
        setProviderOauthStateCookie(ctx.res, "facebook", state);
        return getFacebookAuthUrl(state) as string;
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
      .input(z.object({ state: z.string().optional() }).optional())
      .query(async ({ ctx }) => {
        const { getLinkedInAuthUrl } = await import('./_core/linkedin');
        const state = createProviderOauthState();
        setProviderOauthStateCookie(ctx.res, "linkedin", state);
        return getLinkedInAuthUrl(state) as string;
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
  etsy: router({
    getAuthUrl: protectedProcedure.query(({ ctx }) => {
      const state = createProviderOauthState();
      const { verifier, challenge } = createEtsyPkceVerifier();
      setProviderOauthStateCookie(ctx.res, "etsy", state);
      ctx.res.cookie("tradebilia_etsy_pkce_verifier", verifier, { httpOnly: true, secure: true, sameSite: "lax", path: "/api", maxAge: 600000 });
      return getEtsyAuthUrl(state, challenge);
    }),
    getInfo: protectedProcedure.query(({ ctx }) => getUserEtsyInfo(ctx.user.id)),
    disconnect: protectedProcedure.mutation(async ({ ctx }) => { await clearUserEtsyInfo(ctx.user.id); return { success: true }; }),
  }),

  admin: router({
    uploadSocialContentMedia: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1).max(160),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"]),
        base64Data: z.string().min(1).max(8_500_000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const bytes = Buffer.from(input.base64Data, "base64");
        if (!bytes.length || bytes.length > 6 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Original media must be 6 MB or smaller." });
        }
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-120) || "social-media";
        const { url } = await storagePut(`social-content/admin-${ctx.user.id}/${Date.now()}-${safeFileName}`, bytes, input.contentType);
        return { url, fileName: safeFileName, contentType: input.contentType };
      }),
    getPromotionOpportunities: protectedProcedure
      .input(z.object({
        listingValueMinimum: z.number().min(1).max(10000000).default(1000),
        recentDays: z.number().int().min(1).max(90).default(30),
        limit: z.number().int().min(1).max(24).default(12),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await requireDb();
        const listingValueMinimum = input?.listingValueMinimum ?? 1000;
        const recentDays = input?.recentDays ?? 30;
        const limit = input?.limit ?? 12;
        const recentBoundary = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);

        const [listingRows, tradeRows] = await Promise.all([
          db.execute(sql`SELECT
              l.title,
              l.category,
              l.condition,
              l.grade,
              l.certificationCompany,
              l.itemDetails,
              l.estimatedValue,
              l.createdAt,
              (SELECT imageUrl FROM listingPhotos WHERE listingId = l.id ORDER BY sortOrder ASC LIMIT 1) AS imageUrl
            FROM listings l
            WHERE l.status = 'active'
              AND l.isActive = 1
              AND l.estimatedValue >= ${listingValueMinimum}
              AND ${isPublicMemberEligible(sql`l.ownerId`)}
            ORDER BY l.createdAt DESC
            LIMIT ${limit * 3}`),
          db.execute(sql`SELECT
              tp.completedAt,
              l.title AS requestedListingTitle,
              l.category AS requestedListingCategory,
              l.condition AS requestedListingCondition,
              l.grade AS requestedListingGrade,
              l.certificationCompany AS requestedListingCertificationCompany,
              l.itemDetails AS requestedListingItemDetails,
              (SELECT imageUrl FROM listingPhotos WHERE listingId = l.id ORDER BY sortOrder ASC LIMIT 1) AS imageUrl,
              (SELECT COUNT(*) FROM tradeProposalItems WHERE proposalId = tp.id) + CASE WHEN l.id IS NULL THEN 0 ELSE 1 END AS itemCount,
              (SELECT COALESCE(SUM(ol.estimatedValue), 0) FROM listings ol JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id WHERE tpi.proposalId = tp.id)
                + COALESCE(l.estimatedValue, 0) AS itemValue
            FROM tradeProposals tp
            LEFT JOIN listings l ON l.id = tp.requestedListingId
            WHERE tp.status = 'completed'
              AND tp.completedAt IS NOT NULL
              AND ${isPublicMemberEligible(sql`tp.requesterId`)}
              AND ${isPublicMemberEligible(sql`tp.recipientId`)}
            ORDER BY tp.completedAt DESC
            LIMIT ${limit * 3}`),
        ]);

        const highValueListings = ((listingRows[0] as unknown as any[]) || [])
          .filter((listing) => new Date(listing.createdAt) >= recentBoundary)
          .slice(0, limit)
          .map((listing) => ({
            source: "High-Value Listing" as const,
            title: listing.title,
            category: listing.category,
            condition: listing.condition,
            grade: listing.grade ?? null,
            certificationCompany: listing.certificationCompany ?? null,
            customGradingCompany: getCustomGradingCompany(listing.itemDetails),
            estimatedValue: Number(listing.estimatedValue ?? 0),
            createdAt: listing.createdAt,
            imageUrl: listing.imageUrl ?? null,
          }));

        const completedTrades = ((tradeRows[0] as unknown as any[]) || [])
          .filter((trade) => new Date(trade.completedAt) >= recentBoundary)
          .slice(0, limit)
          .map((trade) => ({
            source: "Completed Trade" as const,
            title: trade.requestedListingTitle || "Collector exchange",
            category: trade.requestedListingCategory ?? null,
            condition: trade.requestedListingCondition ?? null,
            grade: trade.requestedListingGrade ?? null,
            certificationCompany: trade.requestedListingCertificationCompany ?? null,
            customGradingCompany: getCustomGradingCompany(trade.requestedListingItemDetails),
            itemCount: Number(trade.itemCount ?? 0),
            completedAt: trade.completedAt,
            imageUrl: trade.imageUrl ?? null,
          }));

        return { highValueListings, completedTrades, listingValueMinimum, recentDays };
      }),
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
    getPendingAccountApprovals: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      return db.select({
        id: accountApprovalReviews.id,
        userId: accountApprovalReviews.userId,
        username: users.username,
        displayName: userProfiles.displayName,
        email: users.email,
        emailVerified: userProfiles.emailVerified,
        phoneVerified: userProfiles.phoneVerified,
        reasonCode: accountApprovalReviews.reasonCode,
        emailFirstSeenAt: accountApprovalReviews.emailFirstSeenAt,
        createdAt: accountApprovalReviews.createdAt,
      }).from(accountApprovalReviews)
        .leftJoin(users, eq(accountApprovalReviews.userId, users.id))
        .leftJoin(userProfiles, eq(accountApprovalReviews.userId, userProfiles.userId))
        .where(eq(accountApprovalReviews.status, 'pending'))
        .orderBy(desc(accountApprovalReviews.createdAt));
    }),
    reviewAccountApproval: protectedProcedure
      .input(z.object({ reviewId: z.number().int().positive(), status: z.enum(['approved', 'declined']), adminNote: z.string().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        await db.update(accountApprovalReviews).set({
          status: input.status,
          adminNote: input.adminNote?.trim() || null,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        }).where(and(eq(accountApprovalReviews.id, input.reviewId), eq(accountApprovalReviews.status, 'pending')));
        await db.insert(adminActivityLog).values({
          adminId: ctx.user.id,
          action: 'account_approval_reviewed',
          targetType: 'account_approval',
          targetReference: String(input.reviewId),
          summary: `Account approval marked ${input.status}`,
        });
        return { success: true };
      }),
    getApiHealthEvents: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      return db.select().from(apiHealthEvents).orderBy(desc(apiHealthEvents.occurredAt)).limit(100);
    }),
    clearApiHealthEvents: protectedProcedure
      .input(z.object({ eventIds: z.array(z.number().int().positive()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const uniqueEventIds = [...new Set(input.eventIds)];
        const result = await db.delete(apiHealthEvents).where(inArray(apiHealthEvents.id, uniqueEventIds));
        const clearedCount = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
        await db.insert(adminActivityLog).values({
          adminId: ctx.user.id,
          action: 'api_health_events_cleared',
          targetType: 'api_health_events',
          targetReference: uniqueEventIds.join(','),
          summary: `Cleared ${clearedCount} selected API health event${clearedCount === 1 ? '' : 's'}`,
        });
        return { success: true, clearedCount };
      }),
    getOperationsSnapshot: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const [queueRows] = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM accountApprovalReviews WHERE status = 'pending') AS pendingApprovals,
          (SELECT COUNT(*) FROM accountClosureRequests WHERE status = 'pending_review') AS pendingClosureRequests,
          (SELECT COUNT(*) FROM userProfiles up INNER JOIN users u ON u.id = up.userId WHERE up.isMerchant = 1 AND COALESCE(u.merchantVerified, 0) = 0) AS unverifiedMerchants,
          (SELECT COUNT(*) FROM userReports WHERE status = 'pending') AS pendingReports,
          (SELECT COUNT(*) FROM flaggedContent WHERE status = 'pending') AS pendingFlags,
          (SELECT COUNT(*) FROM lowFeedbackFlags WHERE status = 'pending') AS pendingFeedbackFlags,
          (SELECT COUNT(*) FROM supportTickets WHERE status IN ('open','in_progress') AND priority IN ('high','urgent')) AS urgentTickets,
          (SELECT COUNT(*) FROM tradeProposals WHERE status = 'disputed') AS disputedTrades,
          (SELECT COUNT(*) FROM tradeProposals WHERE status IN ('accepted','shipping','shipped') AND ((shippingDeadline IS NOT NULL AND shippingDeadline < NOW()) OR (receiptDeadline IS NOT NULL AND receiptDeadline < NOW()))) AS overdueTradeMilestones,
          (SELECT COUNT(*) FROM apiHealthEvents WHERE occurredAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS recentApiFailures,
          (SELECT COUNT(*) FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS newMembers30d,
          (SELECT COUNT(*) FROM listings WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS newListings30d,
          (SELECT COUNT(*) FROM tradeProposals WHERE completedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS completedTrades30d
      `);
      const counts = (queueRows as unknown as any[])[0] ?? {};
      let schedule: Awaited<ReturnType<typeof listHeartbeatJobs>>["jobs"][number] | null = null;
      try {
        const schedules = await listHeartbeatJobs("", { page: 1, pageSize: 100 });
        schedule = schedules.jobs.find((job) => job.callbackPath === "/api/scheduled/tradeReminders") ?? null;
      } catch {
        schedule = null;
      }
      const [billingRows] = await db.execute(sql`SELECT billingMode, stripeBillingEnabled, paymentEnforcementEnabled FROM billingSettings ORDER BY id ASC LIMIT 1`);
      const billing = (billingRows as unknown as any[])[0] ?? { billingMode: 'free_launch', stripeBillingEnabled: 0, paymentEnforcementEnabled: 0 };
      return {
        schedule,
        recentApiFailures: Number(counts.recentApiFailures ?? 0),
        actionQueue: [
          { key: 'approvals', label: 'Pending approvals', count: Number(counts.pendingApprovals ?? 0), description: 'Accounts awaiting marketplace approval.', tab: 'approvals' },
          { key: 'closureRequests', label: 'Closure requests', count: Number(counts.pendingClosureRequests ?? 0), description: 'Member account-closure requests awaiting review.', tab: 'account-closures' },
          { key: 'merchants', label: 'Unverified merchants', count: Number(counts.unverifiedMerchants ?? 0), description: 'Merchant profiles awaiting verification.', tab: 'users' },
          { key: 'reports', label: 'Member reports', count: Number(counts.pendingReports ?? 0), description: 'Community reports awaiting review.', tab: 'reports' },
          { key: 'flags', label: 'Content flags', count: Number(counts.pendingFlags ?? 0), description: 'Flagged content awaiting review.', tab: 'flagged' },
          { key: 'feedbackFlags', label: 'Feedback safety', count: Number(counts.pendingFeedbackFlags ?? 0), description: 'Low-feedback safety records awaiting review.', tab: 'flagged' },
          { key: 'tickets', label: 'Urgent support', count: Number(counts.urgentTickets ?? 0), description: 'Open or in-progress high-priority tickets.', tab: 'tickets' },
          { key: 'trades', label: 'Trade follow-up', count: Number(counts.disputedTrades ?? 0) + Number(counts.overdueTradeMilestones ?? 0), description: 'Disputed or overdue trade milestones.', tab: 'trades' },
        ],
        launch: { newMembers30d: Number(counts.newMembers30d ?? 0), newListings30d: Number(counts.newListings30d ?? 0), completedTrades30d: Number(counts.completedTrades30d ?? 0) },
        membership: { billingMode: billing.billingMode, stripeBillingEnabled: Boolean(billing.stripeBillingEnabled), paymentEnforcementEnabled: Boolean(billing.paymentEnforcementEnabled) },
      };
    }),
    getActiveTradeLifecycle: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const [rows] = await db.execute(sql`
        SELECT tp.id, tp.status, tp.shippingDeadline, tp.receiptDeadline,
          COALESCE(NULLIF(requesterProfile.displayName, ''), NULLIF(requester.displayName, ''), NULLIF(requester.name, ''), requester.username, CONCAT('Collector ', tp.requesterId)) AS requesterDisplayName,
          COALESCE(NULLIF(recipientProfile.displayName, ''), NULLIF(recipient.displayName, ''), NULLIF(recipient.name, ''), recipient.username, CONCAT('Collector ', tp.recipientId)) AS recipientDisplayName,
          requested.title AS listingTitle,
          (SELECT COUNT(*) FROM tradeTrackingNumbers tracking WHERE tracking.proposalId = tp.id) AS trackingCount,
          (SELECT COUNT(*) FROM tradeReceiptConfirmation receipt WHERE receipt.proposalId = tp.id) AS receiptCount,
          CASE WHEN tp.status IN ('accepted','shipping') THEN tp.shippingDeadline ELSE tp.receiptDeadline END AS nextDeadline,
          CASE WHEN ((tp.shippingDeadline IS NOT NULL AND tp.shippingDeadline < NOW()) OR (tp.receiptDeadline IS NOT NULL AND tp.receiptDeadline < NOW())) THEN 1 ELSE 0 END AS isOverdue
        FROM tradeProposals tp
        LEFT JOIN users requester ON requester.id = tp.requesterId
        LEFT JOIN userProfiles requesterProfile ON requesterProfile.userId = tp.requesterId
        LEFT JOIN users recipient ON recipient.id = tp.recipientId
        LEFT JOIN userProfiles recipientProfile ON recipientProfile.userId = tp.recipientId
        LEFT JOIN listings requested ON requested.id = tp.requestedListingId
        WHERE tp.status IN ('pending','negotiating','accepted','shipping','shipped','frozen','disputed')
        ORDER BY CASE WHEN ((tp.shippingDeadline IS NOT NULL AND tp.shippingDeadline < NOW()) OR (tp.receiptDeadline IS NOT NULL AND tp.receiptDeadline < NOW())) THEN 0 ELSE 1 END, COALESCE(tp.shippingDeadline, tp.receiptDeadline, tp.updatedAt) ASC
        LIMIT 100
      `);
      return rows as unknown as any[];
    }),
    getOperationalTimeline: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const [rows] = await db.execute(sql`
        SELECT CONCAT('moderation-', id) AS eventKey, 'Moderation' AS source, action AS event, createdAt FROM moderationLog
        UNION ALL
        SELECT CONCAT('trade-', id) AS eventKey, 'Trade administration' AS source, eventType AS event, createdAt FROM tradeAdminLog
        UNION ALL
        SELECT CONCAT('membership-', id) AS eventKey, 'Membership provider' AS source, eventType AS event, createdAt FROM membershipProviderEvents
        UNION ALL
        SELECT CONCAT('administrator-', id) AS eventKey, 'Administrator activity' AS source, action AS event, createdAt FROM adminActivityLog
        ORDER BY createdAt DESC LIMIT 100
      `);
      return (rows as unknown as any[]).map((row) => ({ key: row.eventKey, source: row.source, event: row.event, createdAt: row.createdAt }));
    }),
    exportOperationalCsv: protectedProcedure.input(z.object({ kind: z.enum(['listings', 'trades', 'members', 'support_metrics']) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const csvCell = (value: unknown) => {
        const raw = String(value ?? '');
        const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
        return `"${safe.replaceAll('"', '""')}"`;
      };
      const csv = (headers: string[], rows: unknown[][]) => [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
      const recordExport = async () => {
        await db.insert(adminActivityLog).values({
          adminId: ctx.user.id,
          action: 'operational_csv_exported',
          targetType: 'operational_export',
          targetReference: input.kind,
          summary: `Generated ${input.kind.replaceAll('_', ' ')} CSV export`,
        });
      };
      if (input.kind === 'listings') {
        const [rows] = await db.execute(sql`SELECT l.id, l.title, l.category, l.status, l.estimatedValue, COALESCE(NULLIF(up.displayName, ''), NULLIF(u.displayName, ''), u.username, CONCAT('Collector ', l.ownerId)) AS owner, l.createdAt FROM listings l LEFT JOIN users u ON u.id = l.ownerId LEFT JOIN userProfiles up ON up.userId = l.ownerId ORDER BY l.createdAt DESC LIMIT 5000`);
        await recordExport();
        return { filename: 'tradebilia-listings.csv', content: csv(['Listing ID', 'Title', 'Category', 'Status', 'Estimated Value', 'Owner', 'Created'], (rows as unknown as any[]).map((row) => [row.id, row.title, row.category, row.status, row.estimatedValue, row.owner, row.createdAt])) };
      }
      if (input.kind === 'trades') {
        const [rows] = await db.execute(sql`SELECT tp.id, tp.tradeReferenceNumber, tp.status, COALESCE(NULLIF(requesterProfile.displayName, ''), NULLIF(requester.displayName, ''), requester.username, CONCAT('Collector ', tp.requesterId)) AS requester, COALESCE(NULLIF(recipientProfile.displayName, ''), NULLIF(recipient.displayName, ''), recipient.username, CONCAT('Collector ', tp.recipientId)) AS recipient, requested.title AS requestedListing, tp.createdAt, tp.completedAt FROM tradeProposals tp LEFT JOIN users requester ON requester.id = tp.requesterId LEFT JOIN userProfiles requesterProfile ON requesterProfile.userId = tp.requesterId LEFT JOIN users recipient ON recipient.id = tp.recipientId LEFT JOIN userProfiles recipientProfile ON recipientProfile.userId = tp.recipientId LEFT JOIN listings requested ON requested.id = tp.requestedListingId ORDER BY tp.createdAt DESC LIMIT 5000`);
        await recordExport();
        return { filename: 'tradebilia-trades.csv', content: csv(['Trade ID', 'Reference', 'Status', 'Requestor', 'Recipient', 'Requested Listing', 'Created', 'Completed'], (rows as unknown as any[]).map((row) => [row.id, row.tradeReferenceNumber, row.status, row.requester, row.recipient, row.requestedListing, row.createdAt, row.completedAt])) };
      }
      if (input.kind === 'members') {
        const [rows] = await db.execute(sql`SELECT u.id, COALESCE(NULLIF(up.displayName, ''), NULLIF(u.displayName, ''), u.username, CONCAT('Collector ', u.id)) AS displayName, u.username, u.role, u.createdAt, COUNT(CASE WHEN l.status = 'active' THEN l.id END) AS activeListings, COALESCE(um.status, 'free_launch') AS membershipStatus, COALESCE(um.billingTerm, 'none') AS billingTerm FROM users u LEFT JOIN userProfiles up ON up.userId = u.id LEFT JOIN listings l ON l.ownerId = u.id LEFT JOIN userMemberships um ON um.userId = u.id GROUP BY u.id, up.displayName, u.displayName, u.username, u.role, u.createdAt, um.status, um.billingTerm ORDER BY u.createdAt DESC LIMIT 5000`);
        await recordExport();
        return { filename: 'tradebilia-members.csv', content: csv(['Member ID', 'Display Name', 'Username', 'Role', 'Joined', 'Active Listings', 'Membership Status', 'Billing Term'], (rows as unknown as any[]).map((row) => [row.id, row.displayName, row.username, row.role, row.createdAt, row.activeListings, row.membershipStatus, row.billingTerm])) };
      }
      const [rows] = await db.execute(sql`SELECT status, priority, COUNT(*) AS count FROM supportTickets GROUP BY status, priority ORDER BY status, priority`);
      await recordExport();
      return { filename: 'tradebilia-support-metrics.csv', content: csv(['Ticket Status', 'Priority', 'Count'], (rows as unknown as any[]).map((row) => [row.status, row.priority, row.count])) };
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
        email: userProfiles.contactEmail,
        role: users.role,
        createdAt: users.createdAt,
        lastActivityAt: users.lastActivityAt,
        isSuspended: users.isSuspended,
        suspendedAt: users.suspendedAt,
        isBanned: users.isBanned,
        bannedAt: users.bannedAt,
        banReason: users.banReason,
        isAccountClosed: users.isAccountClosed,
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
      isMerchant: userProfiles.isMerchant,
      merchantVerified: users.merchantVerified,
      merchantVerifiedAt: users.merchantVerifiedAt,
      storeName: userProfiles.storeName,
      businessLicense: userProfiles.businessLicense,
      taxId: userProfiles.taxId,
      storeDescription: userProfiles.storeDescription,
      businessAddress: userProfiles.businessAddress,
      businessPhone: userProfiles.businessPhone,
      businessEmail: userProfiles.businessEmail,
      businessWebsite: userProfiles.businessWebsite,
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
      isAccountClosed: number;
      contactFullName: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      contactAddress: string | null;
      contactTown: string | null;
      contactState: string | null;
      contactZipCode: string | null;
      contactCountry: string | null;
      isMerchant: number | null;
      merchantVerified: number | null;
      merchantVerifiedAt: string | null;
      storeName: string | null;
      businessLicense: string | null;
      taxId: string | null;
      storeDescription: string | null;
      businessAddress: string | null;
      businessPhone: string | null;
      businessEmail: string | null;
      businessWebsite: string | null;
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
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Permanent administrator deletion is disabled. Use the retained Archive Account workflow instead.' });
      }),
    archiveUser: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        reason: z.string().trim().min(10).max(180),
        confirmationPhrase: z.literal(ADMIN_ARCHIVE_MEMBER_PHRASE),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Administrators cannot archive their own account.' });
        const db = await requireDb();
        return db.transaction(async (tx: any) => {
          const audit = await getAccountClosureAudit(tx, input.userId);
          if (audit.blockers.length > 0) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'This account has unresolved items. Use the existing Closure Requests workflow after resolving its blockers.' });
          }
          const archived = await closeEligibleAccount(tx, input.userId);
          if (!archived) throw new TRPCError({ code: 'CONFLICT', message: 'The account could not be archived because its eligibility changed. Refresh and review it again.' });
          await tx.insert(adminActivityLog).values({
            adminId: ctx.user.id,
            action: 'member_account_archived',
            targetType: 'member_account',
            targetReference: String(input.userId),
            summary: `Archived member account: ${input.reason}`,
          });
          return { success: true };
        });
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
    getAllTrades: protectedProcedure.input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const requesterProfiles = alias(userProfiles, "adminTradeRequesterProfiles");
      const recipientUsers = alias(users, "adminTradeRecipients");
      const recipientProfiles = alias(userProfiles, "adminTradeRecipientProfiles");
      return db.select({
        id: tradeProposals.id,
        requesterId: tradeProposals.requesterId,
        requesterDisplayName: sql<string>`COALESCE(NULLIF(${requesterProfiles.displayName}, ''), NULLIF(${users.displayName}, ''), NULLIF(${users.name}, ''), ${users.username}, CONCAT('Collector ', ${tradeProposals.requesterId}))`,
        recipientId: tradeProposals.recipientId,
        recipientDisplayName: sql<string>`COALESCE(NULLIF(${recipientProfiles.displayName}, ''), NULLIF(${recipientUsers.displayName}, ''), NULLIF(${recipientUsers.name}, ''), ${recipientUsers.username}, CONCAT('Collector ', ${tradeProposals.recipientId}))`,
        requestedListingId: tradeProposals.requestedListingId,
        listingTitle: listings.title,
        listingCategory: listings.category,
        requestedListingValue: listings.estimatedValue,
        offeredItemCount: sql<number>`(SELECT COUNT(*) FROM tradeProposalItems offeredItems WHERE offeredItems.proposalId = ${tradeProposals.id})`,
        status: tradeProposals.status,
        tradeReferenceNumber: tradeProposals.tradeReferenceNumber,
        referenceNumber: tradeProposals.referenceNumber,
        note: tradeProposals.note,
        initiatorMessage: tradeProposals.initiatorMessage,
        declineReason: tradeProposals.declineReason,
        frozenReason: tradeProposals.frozenReason,
        preFreezeStatus: tradeProposals.preFreezStatus,
        cashFromRequester: tradeProposals.cashFromRequester,
        cashFromRecipient: tradeProposals.cashFromRecipient,
        middleManRequested: tradeProposals.middleManRequested,
        middleManApproved: tradeProposals.middleManApproved,
        createdAt: tradeProposals.createdAt,
        updatedAt: tradeProposals.updatedAt,
        lastActivityAt: tradeProposals.lastActivityAt,
        respondedAt: tradeProposals.respondedAt,
        negotiatingAt: tradeProposals.negotiatingAt,
        acceptedAt: tradeProposals.acceptedAt,
        shippingAt: tradeProposals.shippingAt,
        shippedAt: tradeProposals.shippedAt,
        shippingDeadline: tradeProposals.shippingDeadline,
        receiptDeadline: tradeProposals.receiptDeadline,
        feedbackDeadline: tradeProposals.feedbackDeadline,
        frozenAt: tradeProposals.frozenAt,
        completedAt: tradeProposals.completedAt,
        isArchived: sql<number>`EXISTS(SELECT 1 FROM adminActivityLog archiveLog WHERE archiveLog.action = 'trade_record_archived' AND archiveLog.targetType = 'trade_proposal' AND archiveLog.targetReference = CAST(${tradeProposals.id} AS CHAR))`,
      }).from(tradeProposals)
        .leftJoin(users, eq(tradeProposals.requesterId, users.id))
        .leftJoin(requesterProfiles, eq(tradeProposals.requesterId, requesterProfiles.userId))
        .leftJoin(recipientUsers, eq(tradeProposals.recipientId, recipientUsers.id))
        .leftJoin(recipientProfiles, eq(tradeProposals.recipientId, recipientProfiles.userId))
        .leftJoin(listings, eq(tradeProposals.requestedListingId, listings.id))
        .where(input?.includeArchived ? undefined : sql`NOT EXISTS(SELECT 1 FROM adminActivityLog archiveLog WHERE archiveLog.action = 'trade_record_archived' AND archiveLog.targetType = 'trade_proposal' AND archiveLog.targetReference = CAST(${tradeProposals.id} AS CHAR))`)
        .orderBy(desc(tradeProposals.createdAt));
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
    getPreLaunchRecipients: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return getPreLaunchRecipients();
    }),
    sendPreLaunchUpdate: protectedProcedure
      .input(z.object({ subject: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(5000), deliveryKey: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can send Pre-Launch Email updates' });
        }
        return sendPreLaunchUpdate({ ...input, requestedBy: ctx.user.id });
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
        const sentIds: number[] = [];
        for (const referral of unEmailedReferrals) {
          const ok = await sendReferralInviteEmail({
            recipientEmail: (referral as any).collectorEmail,
            recipientName: (referral as any).collectorName,
            subject: input.subject,
            body: input.message,
          });
          if (ok) {
            sent++;
            sentIds.push(referral.id);
          }
        }
        // Mark successfully-sent referrals as emailed
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
        // Use raw SQL via $client to avoid Drizzle query builder issues with this table
        const rawClient: any = (db as any).$client;
        const pool = typeof rawClient.promise === 'function' ? rawClient.promise() : rawClient;
        await pool.execute(
          'INSERT INTO emailTemplates (templateKey, subject, body, updatedAt, updatedBy) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE subject = VALUES(subject), body = VALUES(body), updatedAt = VALUES(updatedAt), updatedBy = VALUES(updatedBy)',
          ['referral_invite', input.subject, input.body, now, ctx.user.id]
        );
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
        await setIdentityRestrictionStatus(db, { userId: input.userId, status: "restricted", administratorId: ctx.user.id });

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
        await setIdentityRestrictionStatus(db, { userId: input.userId, status: "active" });

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
        await setIdentityRestrictionStatus(db, { userId: input.userId, status: "restricted", administratorId: ctx.user.id });

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
        await setIdentityRestrictionStatus(db, { userId: input.userId, status: "active" });
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
    getAllTickets: protectedProcedure.input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const [rows] = await db.execute(
        sql`SELECT st.*, u.username, u.displayName, u.email,
                   COALESCE(NULLIF(u.displayName, ''), u.username, st.submittedByName, 'Anonymous visitor') AS submitterDisplayName,
                   COALESCE(u.email, st.submittedByEmail) AS submitterEmail,
                   a.username as assignedAdminUsername,
                   EXISTS(SELECT 1 FROM adminActivityLog archiveLog WHERE archiveLog.action = 'support_ticket_closed_retained' AND archiveLog.targetType = 'support_ticket' AND archiveLog.targetReference = CAST(st.id AS CHAR)) AS isArchived
            FROM supportTickets st
            LEFT JOIN users u ON u.id = st.userId
            LEFT JOIN users a ON a.id = st.assignedAdminId
            ${input?.includeArchived ? sql`` : sql`WHERE NOT EXISTS(SELECT 1 FROM adminActivityLog archiveLog WHERE archiveLog.action = 'support_ticket_closed_retained' AND archiveLog.targetType = 'support_ticket' AND archiveLog.targetReference = CAST(st.id AS CHAR))`}
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
      .mutation(async ({ ctx }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Permanent ticket deletion is disabled. Use Close & Retain Ticket instead.' });
      }),
    archiveTicket: protectedProcedure
      .input(z.object({
        ticketId: z.number().int().positive(),
        reason: z.string().trim().min(10).max(180),
        confirmationPhrase: z.literal(ADMIN_CLOSE_TICKET_PHRASE),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const [result] = await db.execute(sql`UPDATE supportTickets SET status = 'closed', updatedAt = NOW(), resolvedAt = COALESCE(resolvedAt, NOW()) WHERE id = ${input.ticketId}`);
        if (!Number((result as any)?.affectedRows ?? 0)) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found.' });
        await db.insert(adminActivityLog).values({
          adminId: ctx.user.id,
          action: 'support_ticket_closed_retained',
          targetType: 'support_ticket',
          targetReference: String(input.ticketId),
          summary: `Closed and retained support ticket: ${input.reason}`,
        });
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
    getLowFeedbackFlags: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await requireDb();
      const memberProfile = alias(userProfiles, 'lowFeedbackMemberProfile');
      return db.select({
        id: lowFeedbackFlags.id,
        userId: lowFeedbackFlags.userId,
        feedbackScore: lowFeedbackFlags.feedbackScore,
        feedbackPercentage: lowFeedbackFlags.feedbackPercentage,
        flaggedReason: lowFeedbackFlags.flaggedReason,
        flaggedAt: lowFeedbackFlags.flaggedAt,
        memberDisplayName: sql<string>`COALESCE(NULLIF(${memberProfile.displayName}, ''), NULLIF(${users.displayName}, ''), ${users.username}, 'Archived member record')`,
      }).from(lowFeedbackFlags).leftJoin(users, eq(users.id, lowFeedbackFlags.userId)).leftJoin(memberProfile, eq(memberProfile.userId, users.id)).where(eq(lowFeedbackFlags.status, 'pending')).orderBy(desc(lowFeedbackFlags.flaggedAt)).limit(200);
    }),
    reviewLowFeedbackFlag: protectedProcedure
      .input(z.object({ flagId: z.number().int().positive(), action: z.enum(['reviewed', 'dismissed', 'action_taken']), adminNotes: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const result = await db.update(lowFeedbackFlags).set({ status: input.action, adminNotes: input.adminNotes?.trim() || null, reviewedBy: ctx.user.id, reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }).where(and(eq(lowFeedbackFlags.id, input.flagId), eq(lowFeedbackFlags.status, 'pending')));
        const updatedCount = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
        if (updatedCount !== 1) throw new TRPCError({ code: 'NOT_FOUND', message: 'That feedback safety record is no longer pending.' });
        await db.insert(adminActivityLog).values({ adminId: ctx.user.id, action: 'low_feedback_flag_reviewed', targetType: 'low_feedback_flag', targetReference: String(input.flagId), summary: `Feedback safety record marked ${input.action}` });
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
      }))
      .mutation(async ({ ctx, input }) => {
        const clientAddress = ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown";
        if (!isRecoveryRequestAllowed(`public-contact:${clientAddress}`, Date.now(), 3)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before sending another message." });
        }
        const db = await requireDb();
        const ticketId = 'TKT-' + Date.now().toString(36).toUpperCase();
        const userId = ctx.user?.id;
        if (userId) {
          await db.execute(
            sql`INSERT INTO supportTickets (ticketId, userId, subject, message, category, priority)
                VALUES (${ticketId}, ${userId}, ${input.subject.trim()}, ${input.message.trim()}, ${input.category}, 'medium')`
          );
        } else {
          await db.execute(
            sql`INSERT INTO supportTickets (ticketId, userId, submittedByName, submittedByEmail, subject, message, category, priority)
                VALUES (${ticketId}, NULL, ${input.name.trim()}, ${input.email.trim().toLowerCase()}, ${input.subject.trim()}, ${input.message.trim()}, ${input.category}, 'medium')`
          );
        }
        return { success: true, ticketId };
      }),
    // Admin trade deletion — full cascade
    deleteTrade: protectedProcedure
      .input(z.object({ tradeId: z.number().int().positive() }))
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Permanent trade deletion is disabled. Use Archive Trade Record instead.' });
      }),
    archiveTrade: protectedProcedure
      .input(z.object({
        tradeId: z.number().int().positive(),
        reason: z.string().trim().min(10).max(180),
        confirmationPhrase: z.literal(ADMIN_ARCHIVE_TRADE_PHRASE),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await requireDb();
        const [trade] = await db.select({ id: tradeProposals.id, status: tradeProposals.status }).from(tradeProposals).where(eq(tradeProposals.id, input.tradeId)).limit(1);
        if (!trade) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found.' });
        if (!['completed', 'declined', 'cancelled'].includes(trade.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only completed, declined, or cancelled trades may be archived. Resolve active, shipping, frozen, or disputed trades through their existing workflow.' });
        }
        const [alreadyArchived] = await db.select({ id: adminActivityLog.id }).from(adminActivityLog).where(and(
          eq(adminActivityLog.action, 'trade_record_archived'),
          eq(adminActivityLog.targetType, 'trade_proposal'),
          eq(adminActivityLog.targetReference, String(input.tradeId)),
        )).limit(1);
        if (alreadyArchived) throw new TRPCError({ code: 'CONFLICT', message: 'This trade record is already archived.' });
        await db.insert(adminActivityLog).values({
          adminId: ctx.user.id,
          action: 'trade_record_archived',
          targetType: 'trade_proposal',
          targetReference: String(input.tradeId),
          summary: `Archived retained trade record: ${input.reason}`,
        });
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
    verifyMerchant: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), verified: z.boolean().default(true) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await requireDb();
        if (input.verified) {
          const now = new Date().toISOString().slice(0, 19).replace("T", " ");
          await db.execute(
            sql`UPDATE users SET merchantVerified = 1, merchantVerifiedAt = ${now}, merchantVerifiedBy = ${ctx.user.id} WHERE id = ${input.userId}`
          );
        } else {
          await db.execute(
            sql`UPDATE users SET merchantVerified = 0, merchantVerifiedAt = NULL, merchantVerifiedBy = NULL WHERE id = ${input.userId}`
          );
        }
        return { success: true, verified: input.verified };
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
          WHERE ${isPublicMemberEligible(sql`u.id`)}
          GROUP BY u.id, up.displayName, up.avatarUrl
          HAVING COUNT(tr.id) > 0
          ORDER BY averageRating DESC, reviewCount DESC
          LIMIT ${limit}`
        );
        return { traders: (rows as unknown as any[]) || [] };
      }),

    getCompletedTrades: publicProcedure
      .input(z.object({
        category: z.enum(["all", ...collectibleCategories]).optional(),
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
          ? sql`AND (
              l.category = ${category}
              OR EXISTS (
                SELECT 1
                FROM listings ol
                JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id
                WHERE tpi.proposalId = tp.id AND ol.category = ${category}
              )
            )`
          : sql``;

        const [rows] = await db.execute(
          sql`SELECT
            tp.id,
            tp.tradeReferenceNumber,
            tp.completedAt,
            tp.requesterId,
            tp.recipientId,
            tp.cashFromRequester,
            tp.cashFromRecipient,
            -- Public requester identity with display-name-first fallback
            COALESCE(NULLIF(req_up.displayName, ''), NULLIF(req_u.displayName, ''), NULLIF(req_u.name, ''), req_u.username, 'Collector') as requesterDisplayName,
            req_u.username as requesterUsername,
            req_up.avatarUrl as requesterAvatarUrl,
            (SELECT AVG(overallRating) FROM tradeReviews WHERE revieweeId = tp.requesterId AND isVisible = 1) as requesterAverageRating,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = tp.requesterId AND isVisible = 1) as requesterReviewCount,
            (req_u.ebayUsername IS NOT NULL AND req_u.ebayUsername != '') as requesterEbayVerified,
            req_u.facebookVerified as requesterFacebookVerified,
            (req_u.linkedinId IS NOT NULL AND req_u.linkedinId != '') as requesterLinkedinVerified,
            req_u.paypalVerified as requesterPaypalVerified,
            req_u.merchantVerified as requesterMerchantVerified,
            (COALESCE(JSON_UNQUOTE(JSON_EXTRACT(req_up.connectedAccounts, '$.etsy.etsyUserId')), '') != '') as requesterEtsyVerified,
            -- Public recipient identity with display-name-first fallback
            COALESCE(NULLIF(rec_up.displayName, ''), NULLIF(rec_u.displayName, ''), NULLIF(rec_u.name, ''), rec_u.username, 'Collector') as recipientDisplayName,
            rec_u.username as recipientUsername,
            rec_up.avatarUrl as recipientAvatarUrl,
            (SELECT AVG(overallRating) FROM tradeReviews WHERE revieweeId = tp.recipientId AND isVisible = 1) as recipientAverageRating,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = tp.recipientId AND isVisible = 1) as recipientReviewCount,
            (rec_u.ebayUsername IS NOT NULL AND rec_u.ebayUsername != '') as recipientEbayVerified,
            rec_u.facebookVerified as recipientFacebookVerified,
            (rec_u.linkedinId IS NOT NULL AND rec_u.linkedinId != '') as recipientLinkedinVerified,
            rec_u.paypalVerified as recipientPaypalVerified,
            rec_u.merchantVerified as recipientMerchantVerified,
            (COALESCE(JSON_UNQUOTE(JSON_EXTRACT(rec_up.connectedAccounts, '$.etsy.etsyUserId')), '') != '') as recipientEtsyVerified,
            -- Requested listing (the item that started the trade)
            l.id as requestedListingId,
            l.title as requestedListingTitle,
            l.category as requestedListingCategory,
            l.condition as requestedListingCondition,
            l.grade as requestedListingGrade,
            l.certificationCompany as requestedListingCertificationCompany,
            l.itemDetails as requestedListingItemDetails,
            l.estimatedValue as requestedListingValue,
            (SELECT imageUrl FROM listingPhotos WHERE listingId = l.id ORDER BY sortOrder ASC LIMIT 1) as requestedListingImage,
            -- Item count and total value
            (SELECT COUNT(*) FROM tradeProposalItems WHERE proposalId = tp.id) + CASE WHEN l.id IS NULL THEN 0 ELSE 1 END as itemCount,
            (SELECT COALESCE(SUM(ol.estimatedValue), 0) FROM listings ol JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id WHERE tpi.proposalId = tp.id)
              + COALESCE(l.estimatedValue, 0)
              + COALESCE(tp.cashFromRequester, 0)
              + COALESCE(tp.cashFromRecipient, 0) as totalValue
          FROM tradeProposals tp
          LEFT JOIN users req_u ON req_u.id = tp.requesterId
          LEFT JOIN userProfiles req_up ON req_up.userId = tp.requesterId
          LEFT JOIN users rec_u ON rec_u.id = tp.recipientId
          LEFT JOIN userProfiles rec_up ON rec_up.userId = tp.recipientId
          LEFT JOIN listings l ON l.id = tp.requestedListingId
          WHERE tp.status = 'completed'
            AND tp.completedAt IS NOT NULL
            AND ${isPublicMemberEligible(sql`tp.requesterId`)}
            AND ${isPublicMemberEligible(sql`tp.recipientId`)}
            ${categoryFilter}
          ${sql.raw(orderClause)}
          LIMIT ${limit} OFFSET ${offset}`
        );

        const trades = (rows as unknown as any[]) || [];

        // Return every offered item for each completed exchange so public trade summaries are complete.
        const enriched = await Promise.all(trades.map(async (trade: any) => {
          const [offeredRows] = await db.execute(
            sql`SELECT ol.id, ol.title, ol.category, ol.condition, ol.grade, ol.certificationCompany, ol.itemDetails, ol.estimatedValue,
              (SELECT imageUrl FROM listingPhotos WHERE listingId = ol.id ORDER BY sortOrder ASC LIMIT 1) as imageUrl
            FROM listings ol
            JOIN tradeProposalItems tpi ON tpi.offeredListingId = ol.id
            WHERE tpi.proposalId = ${trade.id}`
          );
          const offeredItems = ((offeredRows as unknown as any[]) || []).map((item: any) => ({
            ...item,
            customGradingCompany: getCustomGradingCompany(item.itemDetails),
          }));
          return {
            ...trade,
            requestedListingCustomGradingCompany: getCustomGradingCompany(trade.requestedListingItemDetails),
            offeredItems,
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
        const seller = await db
          .select({ lastActivityAt: users.lastActivityAt, id: users.id })
          .from(users)
          .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
          .where(and(
            eq(users.id, input.sellerId),
            eq(users.isAccountClosed, 0),
            eq(userProfiles.showProfile, 1),
          ))
          .limit(1);
        if (!seller.length) return { isOnline: false };
        const lastActivity = seller[0].lastActivityAt;
        const now = new Date();
        const timeSinceActivity = now.getTime() - new Date(lastActivity).getTime();
        const ONLINE_STATUS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
        const isOnline = timeSinceActivity < ONLINE_STATUS_TIMEOUT_MS;
        // Removed verbose logging to reduce I/O overhead during high request volume
        return { isOnline };
      }),
    getMultipleSellerOnlineStatus: publicProcedure
      .input(z.object({ sellerIds: z.array(z.number().int().positive()) }))
      .query(async ({ input }) => {
        if (!input.sellerIds.length) return {};
        const db = await requireDb();
        const sellers = await db
          .select({ id: users.id, lastActivityAt: users.lastActivityAt })
          .from(users)
          .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
          .where(and(
            inArray(users.id, input.sellerIds),
            eq(users.isAccountClosed, 0),
            eq(userProfiles.showProfile, 1),
          ));
        const ONLINE_STATUS_TIMEOUT_MS = 5 * 60 * 1000;
        const now = new Date();
        const result: Record<number, { isOnline: boolean }> = {};
        sellers.forEach(seller => {
          const timeSinceActivity = now.getTime() - new Date(seller.lastActivityAt).getTime();
          result[seller.id] = {
            isOnline: timeSinceActivity < ONLINE_STATUS_TIMEOUT_MS,
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

    pending: protectedProcedure
      .query(({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return getPendingConventions();
      }),

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

    /** Private member-only setup data. Direct-payment identifiers are never returned by public profile routes. */
    getExternalPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const result = await db.select({
        paypalEmail: users.paypalEmail,
        paypalVerified: users.paypalVerified,
        paypalVerifiedAt: users.paypalVerifiedAt,
        venmoUsername: users.venmoUsername,
        cashAppCashtag: users.cashAppCashtag,
        zelleEmail: users.zelleEmail,
        zellePhone: users.zellePhone,
        updatedAt: users.externalPaymentMethodsUpdatedAt,
      }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return result[0] ?? { paypalEmail: null, paypalVerified: 0, paypalVerifiedAt: null, venmoUsername: null, cashAppCashtag: null, zelleEmail: null, zellePhone: null, updatedAt: null };
    }),

    /** Saves private member payment preferences for future negotiations. Accepted trade snapshots are not changed. */
    saveExternalPaymentMethods: protectedProcedure
      .input(externalPaymentMethodsInputSchema)
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const nextMethods = normalizeExternalPaymentMethods(input);
        const currentRows = await db.select({
          paypalEmail: users.paypalEmail,
          venmoUsername: users.venmoUsername,
          cashAppCashtag: users.cashAppCashtag,
          zelleEmail: users.zelleEmail,
          zellePhone: users.zellePhone,
        }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const current = currentRows[0];
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Member account not found." });

        const methodChanged = current.paypalEmail !== nextMethods.paypalEmail
          || current.venmoUsername !== nextMethods.venmoUsername
          || current.cashAppCashtag !== nextMethods.cashAppCashtag
          || current.zelleEmail !== nextMethods.zelleEmail
          || current.zellePhone !== nextMethods.zellePhone;
        const now = mysqlNow();

        await db.update(users).set({
          ...nextMethods,
          paypalVerified: current.paypalEmail === nextMethods.paypalEmail ? undefined : 0,
          paypalVerifiedAt: current.paypalEmail === nextMethods.paypalEmail ? undefined : null,
          externalPaymentMethodsUpdatedAt: now,
        }).where(eq(users.id, ctx.user.id));

        return { success: true, preferencesChanged: methodChanged };
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
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();

        const proposalResult = await db
          .select({
            requesterId: tradeProposals.requesterId,
            recipientId: tradeProposals.recipientId,
            status: tradeProposals.status,
            cashFromRequester: tradeProposals.cashFromRequester,
            cashFromRecipient: tradeProposals.cashFromRecipient,
          })
          .from(tradeProposals)
          .where(eq(tradeProposals.id, input.proposalId))
          .limit(1);
        const proposal = proposalResult[0];
        if (!proposal) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Trade proposal not found." });
        }
        const expectedPayeeId = ctx.user.id === proposal.requesterId ? proposal.recipientId : proposal.requesterId;
        if (!isAuthorizedPaymentVerification(proposal, ctx.user.id, expectedPayeeId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Payment verification is limited to the two participants in this trade.",
          });
        }
        if (proposal.status !== "accepted") {
          throw new TRPCError({ code: "CONFLICT", message: "Cash payments can be verified only while this trade is accepted." });
        }
        const obligation = getPaymentVerificationObligation(proposal, ctx.user.id);
        if (!obligation) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You do not owe a cash payment for this trade." });
        }

        const reusedTransaction = await db
          .select({ proposalId: tradePayments.proposalId })
          .from(tradePayments)
          .where(eq(tradePayments.transactionId, input.transactionId))
          .limit(1);
        if (reusedTransaction[0] && reusedTransaction[0].proposalId !== input.proposalId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This PayPal transaction is already associated with a different trade.",
          });
        }

        // Get the payee's PayPal email
        const payeeResult = await db
          .select({ paypalEmail: users.paypalEmail })
          .from(users)
          .where(eq(users.id, obligation.payeeId))
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
          details: JSON.stringify({ transactionId: input.transactionId, amount: obligation.amount }),
        });

        // Verify with PayPal
        const result = await verifyPayPalTransaction(
          input.transactionId,
          payeePaypalEmail,
          obligation.amount
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
          payeeId: obligation.payeeId,
          amount: obligation.amount.toFixed(2),
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
            amount: obligation.amount,
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
     * Returns cash obligations plus compatible method labels to a trade participant.
     * Private destinations are returned only to the payer during Shipping or
     * Confirm Receipt, after both members accept final terms.
     */
    getCashAdjustmentContext: protectedProcedure
      .input(z.object({ proposalId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await requireDb();
        const proposalRows = await db.select({
          requesterId: tradeProposals.requesterId,
          recipientId: tradeProposals.recipientId,
          status: tradeProposals.status,
          cashFromRequester: tradeProposals.cashFromRequester,
          cashFromRecipient: tradeProposals.cashFromRecipient,
        }).from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
        const proposal = proposalRows[0];
        if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Trade proposal not found." });
        if (proposal.requesterId !== ctx.user.id && proposal.recipientId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Cash adjustment details are limited to trade participants." });
        const paymentMembers = await getPaymentMethodMembers(db, [proposal.requesterId, proposal.recipientId]);
        const memberById = new Map(paymentMembers.map((member) => [member.id, member]));
        const currentMember = memberById.get(ctx.user.id);
        const partnerId = proposal.requesterId === ctx.user.id ? proposal.recipientId : proposal.requesterId;
        const partner = memberById.get(partnerId);
        const sharedMethods = currentMember && partner
          ? getSharedExternalPaymentMethods(currentMember, partner)
          : [];
        const partnerMethods = partner
          ? getEnabledExternalPaymentMethods(partner).map((method) => ({ method, label: getExternalPaymentMethodLabel(method) }))
          : [];
        const supportedStatuses = ["negotiating", "accepted", "shipping", "shipped"];
        if (!supportedStatuses.includes(proposal.status)) {
          return { obligations: [], sharedMethods, partnerMethods, partnerDisplayName: memberPaymentDisplayName(partner) };
        }

        const obligations = getPaymentVerificationObligations(proposal);
        const paymentRows = obligations.length
          ? await db.select().from(tradePayments).where(and(eq(tradePayments.proposalId, input.proposalId), inArray(tradePayments.payerId, obligations.map((obligation) => obligation.payerId))))
          : [];
        const paymentByPayerId = new Map(paymentRows.map((payment) => [payment.payerId, payment]));
        const mayRevealDestination = proposal.status === "shipping" || proposal.status === "shipped";

        return {
          sharedMethods,
          partnerMethods,
          partnerDisplayName: memberPaymentDisplayName(partner),
          obligations: obligations.map((obligation) => ({
            ...obligation,
            role: obligation.payerId === ctx.user.id ? "payer" as const : "payee" as const,
            payment: (() => {
              const payment = paymentByPayerId.get(obligation.payerId);
              if (!payment) return null;
              return {
                id: payment.id,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                paymentMethodSelectedAt: payment.paymentMethodSelectedAt,
                sentAt: payment.sentAt,
                receivedAt: payment.receivedAt,
                paymentIdentifier: mayRevealDestination && obligation.payerId === ctx.user.id ? payment.paymentIdentifier : null,
              };
            })(),
            sharedMethods,
          })),
        };
      }),

    selectCashAdjustmentMethod: protectedProcedure
      .input(z.object({ proposalId: z.number().int().positive(), method: externalPaymentMethodSchema }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const proposalRows = await db.select({ requesterId: tradeProposals.requesterId, recipientId: tradeProposals.recipientId, status: tradeProposals.status, cashFromRequester: tradeProposals.cashFromRequester, cashFromRecipient: tradeProposals.cashFromRecipient })
          .from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
        const proposal = proposalRows[0];
        if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Trade proposal not found." });
        if (proposal.status !== "negotiating") throw new TRPCError({ code: "CONFLICT", message: "Choose a payment method while the trade is being negotiated, before acceptance." });
        const payerId = ctx.user.id === proposal.requesterId ? proposal.recipientId : proposal.requesterId;
        const obligation = getPaymentVerificationObligation(proposal, payerId);
        if (!obligation || obligation.payeeId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the trade participant receiving cash can choose the payment method." });

        const paymentMembers = await getPaymentMethodMembers(db, [proposal.requesterId, proposal.recipientId]);
        const memberById = new Map(paymentMembers.map((member) => [member.id, member]));
        const payee = memberById.get(ctx.user.id);
        const payer = memberById.get(obligation.payerId);
        const identifier = getExternalPaymentIdentifier(input.method, payee ?? {});
        if (!identifier) throw new TRPCError({ code: "BAD_REQUEST", message: `Add and enable your ${getExternalPaymentMethodLabel(input.method)} destination in Profile before selecting it for a trade.` });
        const sharedMethods = payee && payer ? getSharedExternalPaymentMethods(payee, payer) : [];
        if (!sharedMethods.some((method) => method.method === input.method)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Both members must enable ${getExternalPaymentMethodLabel(input.method)} before it can be selected for this cash payment.` });
        }

        const existingRows = await db.select({ id: tradePayments.id, status: tradePayments.status }).from(tradePayments)
          .where(and(eq(tradePayments.proposalId, input.proposalId), eq(tradePayments.payerId, obligation.payerId))).limit(1);
        if (existingRows[0]?.status === "sent" || existingRows[0]?.status === "received") throw new TRPCError({ code: "CONFLICT", message: "A payment method cannot be changed after the payer marks it sent. Open a dispute if the details are wrong." });
        const now = mysqlNow();
        const paymentData = {
          proposalId: input.proposalId,
          payerId: obligation.payerId,
          payeeId: ctx.user.id,
          amount: obligation.amount.toFixed(2),
          paypalEmail: input.method === "paypal" ? identifier : null,
          paymentMethod: input.method,
          paymentIdentifier: identifier,
          paymentMethodSelectedAt: now,
          transactionId: null,
          status: "method_selected" as const,
          verificationResult: JSON.stringify({ source: "payee_selected_external_method", directPaymentDisclosureAcknowledged: true }),
          verifiedAt: null,
          sentAt: null,
          receivedAt: null,
          disputeOpenedAt: null,
          disputeOpenedBy: null,
          disputeReason: null,
        };
        if (existingRows[0]) await db.update(tradePayments).set(paymentData).where(eq(tradePayments.id, existingRows[0].id));
        else await db.insert(tradePayments).values(paymentData);
        await db.execute(sql`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType = 'accepted'`);
        await db.execute(sql`UPDATE tradeProposals SET lastProposedBy = ${ctx.user.id}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId} AND status = 'negotiating'`);
        await db.insert(tradeActivityLog).values({ proposalId: input.proposalId, actorId: ctx.user.id, actorName: ctx.user.name ?? ctx.user.username ?? "Member", eventType: "cash_payment_method_selected", details: JSON.stringify({ method: input.method, amount: obligation.amount }), createdAt: now });
        return { success: true, status: "method_selected" as const, method: input.method };
      }),

    markCashAdjustmentSent: protectedProcedure
      .input(z.object({ proposalId: z.number().int().positive(), transactionReference: z.string().trim().max(255).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const proposalRows = await db.select({ requesterId: tradeProposals.requesterId, recipientId: tradeProposals.recipientId, requestedListingId: tradeProposals.requestedListingId, status: tradeProposals.status, cashFromRequester: tradeProposals.cashFromRequester, cashFromRecipient: tradeProposals.cashFromRecipient })
          .from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
        if (proposalRows[0]?.status !== "shipping") throw new TRPCError({ code: "CONFLICT", message: "Mark a cash payment sent during Step 4, Shipping & Payment." });
        const obligation = proposalRows[0] ? getPaymentVerificationObligation(proposalRows[0], ctx.user.id) : null;
        if (!obligation) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have a payable cash adjustment for this accepted trade." });
        const paymentRows = await db.select({ id: tradePayments.id, status: tradePayments.status, paymentMethod: tradePayments.paymentMethod }).from(tradePayments)
          .where(and(eq(tradePayments.proposalId, input.proposalId), eq(tradePayments.payerId, ctx.user.id))).limit(1);
        const payment = paymentRows[0];
        if (!payment || payment.status !== "method_selected") throw new TRPCError({ code: "CONFLICT", message: "Wait for your partner to choose a payment method before marking payment sent." });
        const now = mysqlNow();
        await db.update(tradePayments).set({ status: "sent", transactionId: normalizeOptionalText(input.transactionReference), sentAt: now, verificationResult: JSON.stringify({ source: "payer_marked_sent", externalVerification: "not_available" }) }).where(eq(tradePayments.id, payment.id));
        await db.insert(tradeActivityLog).values({ proposalId: input.proposalId, actorId: ctx.user.id, actorName: ctx.user.name ?? ctx.user.username ?? "Member", eventType: "cash_payment_marked_sent", details: JSON.stringify({ method: payment.paymentMethod, amount: obligation.amount, transactionReferenceProvided: Boolean(normalizeOptionalText(input.transactionReference)) }), createdAt: now });

        const proposal = proposalRows[0];
        const [itemRows] = await db.execute(sql`SELECT offeredListingId AS listingId FROM tradeProposalItems WHERE proposalId = ${input.proposalId}`);
        const tradeListingIds = [...new Set([proposal.requestedListingId, ...((itemRows as unknown as Array<{ listingId: number }>) || []).map((item) => item.listingId)].filter((listingId): listingId is number => Number.isInteger(listingId)))];
        const [trackingRows] = await db.execute(sql`SELECT listingId FROM tradeTrackingNumbers WHERE proposalId = ${input.proposalId}`);
        const trackedListingIds = ((trackingRows as unknown as Array<{ listingId: number }>) || []).map((tracking) => tracking.listingId);
        const cashObligations = getPaymentVerificationObligations(proposal);
        const allPaymentRows = await db.select({ payerId: tradePayments.payerId, status: tradePayments.status }).from(tradePayments)
          .where(and(eq(tradePayments.proposalId, input.proposalId), inArray(tradePayments.payerId, cashObligations.map((cashObligation) => cashObligation.payerId))));
        const allTrackingSubmitted = tradeListingIds.every((listingId) => trackedListingIds.map(Number).includes(Number(listingId)));
        const allCashPaymentsSent = cashObligations.every((cashObligation) => ["sent", "received", "verified"].includes(allPaymentRows.find((paymentRow) => paymentRow.payerId === cashObligation.payerId)?.status ?? "pending"));
        const readyForReceiptConfirmation = allTrackingSubmitted && allCashPaymentsSent;
        if (readyForReceiptConfirmation) {
          await db.execute(sql`UPDATE tradeProposals SET status = 'shipped', shippedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId} AND status = 'shipping'`);
        }
        return { success: true, status: "sent" as const, readyForReceiptConfirmation };
      }),

    confirmCashAdjustmentReceived: protectedProcedure
      .input(z.object({ proposalId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const proposalRows = await db.select({ status: tradeProposals.status }).from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
        if (proposalRows[0]?.status !== "shipped") throw new TRPCError({ code: "CONFLICT", message: "Confirm cash receipt during Step 5, Confirm Receipt." });
        const paymentRows = await db.select({ id: tradePayments.id, payerId: tradePayments.payerId, payeeId: tradePayments.payeeId, status: tradePayments.status, paymentMethod: tradePayments.paymentMethod, amount: tradePayments.amount })
          .from(tradePayments).where(and(eq(tradePayments.proposalId, input.proposalId), eq(tradePayments.payeeId, ctx.user.id))).limit(1);
        const payment = paymentRows[0];
        if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "No cash adjustment is awaiting your receipt confirmation." });
        if (payment.status !== "sent") throw new TRPCError({ code: "CONFLICT", message: "The payer must mark the cash adjustment sent before you can confirm receipt." });
        const now = mysqlNow();
        await db.update(tradePayments).set({ status: "received", receivedAt: now, verifiedAt: now, verificationResult: JSON.stringify({ source: "payee_confirmed_received", externalVerification: "member_confirmed" }) }).where(eq(tradePayments.id, payment.id));
        await db.insert(tradeActivityLog).values({ proposalId: input.proposalId, actorId: ctx.user.id, actorName: ctx.user.name ?? ctx.user.username ?? "Member", eventType: "cash_payment_received_confirmed", details: JSON.stringify({ method: payment.paymentMethod, amount: payment.amount, payerId: payment.payerId }), createdAt: now });

        const [proposalRowsForCompletion] = await db.execute(sql`SELECT requesterId, recipientId, requestedListingId, cashFromRequester, cashFromRecipient, status FROM tradeProposals WHERE id = ${input.proposalId}`);
        const proposal = (proposalRowsForCompletion as unknown as Array<any>)?.[0];
        const cashObligations = proposal ? getPaymentVerificationObligations(proposal) : [];
        const allPaymentRows = cashObligations.length
          ? await db.select({ payerId: tradePayments.payerId, status: tradePayments.status }).from(tradePayments)
            .where(and(eq(tradePayments.proposalId, input.proposalId), inArray(tradePayments.payerId, cashObligations.map((cashObligation) => cashObligation.payerId))))
          : [];
        const allCashPaymentsReceived = cashObligations.every((cashObligation) => ["received", "verified"].includes(allPaymentRows.find((paymentRow) => paymentRow.payerId === cashObligation.payerId)?.status ?? "pending"));
        const [itemRows] = await db.execute(sql`SELECT offeredListingId AS listingId FROM tradeProposalItems WHERE proposalId = ${input.proposalId}`);
        const tradeListingIds = [...new Set([proposal?.requestedListingId, ...((itemRows as unknown as Array<{ listingId: number }>) || []).map((item) => item.listingId)].filter((listingId): listingId is number => Number.isInteger(listingId)))];
        const [listingRows] = tradeListingIds.length
          ? await db.execute(sql`SELECT id, ownerId FROM listings WHERE id IN (${sql.join(tradeListingIds.map((listingId) => sql`${listingId}`), sql`, `)})`)
          : [[]];
        const expectedItemRecipientIds = ((listingRows as unknown as Array<{ ownerId: number }>) || []).map((listing) => listing.ownerId === proposal?.requesterId ? proposal?.recipientId : proposal?.requesterId).filter((userId): userId is number => Number.isInteger(userId));
        const [receiptRows] = await db.execute(sql`SELECT DISTINCT userId FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType IN ('received', 'damaged')`);
        const confirmedRecipientIds = ((receiptRows as unknown as Array<{ userId: number }>) || []).map((receipt) => receipt.userId);
        const allRequiredItemReceiptsConfirmed = [...new Set(expectedItemRecipientIds)].every((userId) => confirmedRecipientIds.includes(userId));
        const completed = allCashPaymentsReceived && allRequiredItemReceiptsConfirmed;
        if (completed) {
          const referenceNumber = `TR-${String(input.proposalId).padStart(5, '0')}`;
          await db.execute(sql`UPDATE tradeProposals SET status = 'completed', completedAt = ${now}, referenceNumber = ${referenceNumber}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId} AND status = 'shipped'`);
        }
        return { success: true, status: "received" as const, completed };
      }),

    openCashAdjustmentDispute: protectedProcedure
      .input(z.object({ proposalId: z.number().int().positive(), payerId: z.number().int().positive(), reason: z.string().trim().min(5).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        const paymentRows = await db.select({ id: tradePayments.id, payerId: tradePayments.payerId, payeeId: tradePayments.payeeId, status: tradePayments.status, paymentMethod: tradePayments.paymentMethod })
          .from(tradePayments).where(and(eq(tradePayments.proposalId, input.proposalId), eq(tradePayments.payerId, input.payerId))).limit(1);
        const payment = paymentRows[0];
        if (!payment || (payment.payerId !== ctx.user.id && payment.payeeId !== ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Only a trade participant may open a cash-adjustment dispute." });
        const now = mysqlNow();
        await db.update(tradePayments).set({ status: "disputed", disputeOpenedAt: now, disputeOpenedBy: ctx.user.id, disputeReason: input.reason }).where(eq(tradePayments.id, payment.id));
        await db.insert(tradeActivityLog).values({ proposalId: input.proposalId, actorId: ctx.user.id, actorName: ctx.user.name ?? ctx.user.username ?? "Member", eventType: "cash_payment_dispute_opened", details: JSON.stringify({ method: payment.paymentMethod, reason: input.reason }), createdAt: now });
        return { success: true, status: "disputed" as const };
      }),

    listExternalCashAdjustmentsForAdmin: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await requireDb();
      const [rows] = await db.execute(sql`
        SELECT tp.id AS paymentId, tp.proposalId, tp.amount, tp.paymentMethod, tp.status, tp.paymentIdentifier, tp.transactionId, tp.sentAt, tp.receivedAt, tp.disputeOpenedAt,
          COALESCE(NULLIF(payer_profile.displayName, ''), NULLIF(payer.name, ''), NULLIF(payer.username, ''), 'Member') AS payerName,
          COALESCE(NULLIF(payee_profile.displayName, ''), NULLIF(payee.name, ''), NULLIF(payee.username, ''), 'Member') AS payeeName
        FROM tradePayments tp
        JOIN users payer ON payer.id = tp.payerId
        JOIN users payee ON payee.id = tp.payeeId
        LEFT JOIN userProfiles payer_profile ON payer_profile.userId = payer.id
        LEFT JOIN userProfiles payee_profile ON payee_profile.userId = payee.id
        ORDER BY COALESCE(tp.updatedAt, tp.createdAt) DESC
        LIMIT 100
      `);
      return (rows as unknown as Array<any>).map((row) => ({ ...row, paymentIdentifier: maskExternalPaymentIdentifier(row.paymentIdentifier), transactionId: row.transactionId ? maskExternalPaymentIdentifier(row.transactionId) : null }));
    }),

    revealExternalCashIdentifierForAdmin: protectedProcedure
      .input(z.object({ paymentId: z.number().int().positive(), confirmationPhrase: z.literal(ADMIN_REVEAL_CASH_IDENTIFIER_PHRASE) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await requireDb();
        const rows = await db.select({ proposalId: tradePayments.proposalId, method: tradePayments.paymentMethod, identifier: tradePayments.paymentIdentifier })
          .from(tradePayments).where(eq(tradePayments.id, input.paymentId)).limit(1);
        const payment = rows[0];
        if (!payment?.identifier || !payment.method) throw new TRPCError({ code: "NOT_FOUND", message: "A selected external payment identifier was not found." });
        const now = mysqlNow();
        await db.insert(tradeActivityLog).values({ proposalId: payment.proposalId, actorId: ctx.user.id, actorName: ctx.user.name ?? ctx.user.username ?? "Administrator", eventType: "cash_payment_terms_reset", details: JSON.stringify({ adminAction: "identifier_revealed", paymentId: input.paymentId, method: payment.method }), createdAt: now });
        return { method: payment.method, identifier: payment.identifier };
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
