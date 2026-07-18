var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/const.ts
var COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG;
var init_const = __esm({
  "shared/const.ts"() {
    "use strict";
    COOKIE_NAME = "app_session_id";
    ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
    AXIOS_TIMEOUT_MS = 3e4;
    UNAUTHED_ERR_MSG = "Please login (10001)";
    NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
  }
});

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  conventionCategories: () => conventionCategories,
  conventions: () => conventions,
  deletedAccounts: () => deletedAccounts,
  draftListings: () => draftListings,
  ebayFeedbackHistory: () => ebayFeedbackHistory,
  emailVerificationOtps: () => emailVerificationOtps,
  favorites: () => favorites,
  forumPosts: () => forumPosts,
  forumReplies: () => forumReplies,
  inquiryReplies: () => inquiryReplies,
  itemInquiries: () => itemInquiries,
  listingPhotos: () => listingPhotos,
  listings: () => listings,
  lowFeedbackFlags: () => lowFeedbackFlags,
  passwordResetTokens: () => passwordResetTokens,
  phoneVerificationOtps: () => phoneVerificationOtps,
  referralRequests: () => referralRequests,
  tradeMessages: () => tradeMessages,
  tradeProposalItems: () => tradeProposalItems,
  tradeProposals: () => tradeProposals,
  tradeReviews: () => tradeReviews,
  userProfiles: () => userProfiles,
  userReports: () => userReports,
  users: () => users,
  watchlistEntries: () => watchlistEntries
});
import { mysqlTable, index, int, varchar, text, timestamp, mysqlEnum, decimal, tinyint } from "drizzle-orm/mysql-core";
var deletedAccounts, draftListings, ebayFeedbackHistory, emailVerificationOtps, favorites, forumPosts, forumReplies, inquiryReplies, itemInquiries, listingPhotos, listings, lowFeedbackFlags, passwordResetTokens, phoneVerificationOtps, referralRequests, tradeMessages, tradeProposalItems, tradeProposals, tradeReviews, userProfiles, userReports, users, watchlistEntries, conventionCategories, conventions;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    deletedAccounts = mysqlTable(
      "deletedAccounts",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull(),
        username: varchar({ length: 64 }).notNull(),
        email: varchar({ length: 320 }),
        displayName: varchar({ length: 255 }),
        firstName: varchar({ length: 100 }),
        lastName: varchar({ length: 100 }),
        deletedBy: int().notNull().references(() => users.id),
        reason: text(),
        deletedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("deletedAccounts_userId_idx").on(table.userId),
        index("deletedAccounts_username_idx").on(table.username),
        index("deletedAccounts_email_idx").on(table.email),
        index("deletedAccounts_deletedAt_idx").on(table.deletedAt)
      ]
    );
    draftListings = mysqlTable(
      "draftListings",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull().references(() => users.id),
        title: varchar({ length: 160 }).notNull(),
        category: mysqlEnum(["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins"]).notNull(),
        grade: varchar({ length: 50 }).default("ungraded").notNull(),
        graderCompany: varchar({ length: 100 }),
        certificationNumber: varchar({ length: 100 }),
        estimatedValue: decimal({ precision: 12, scale: 2 }),
        categoryFields: text(),
        additionalNotes: text(),
        photos: text(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        index("draftListings_user_idx").on(table.userId),
        index("draftListings_createdAt_idx").on(table.createdAt)
      ]
    );
    ebayFeedbackHistory = mysqlTable(
      "ebayFeedbackHistory",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull().references(() => users.id),
        feedbackId: varchar({ length: 64 }).notNull(),
        rating: mysqlEnum(["positive", "neutral", "negative"]).notNull(),
        comment: text(),
        from: varchar({ length: 64 }).notNull(),
        itemId: varchar({ length: 64 }),
        itemTitle: varchar({ length: 255 }),
        feedbackDate: timestamp({ mode: "string" }).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("ebayFeedbackHistory_userId_idx").on(table.userId),
        index("ebayFeedbackHistory_feedbackId_idx").on(table.feedbackId),
        index("ebayFeedbackHistory_feedbackDate_idx").on(table.feedbackDate)
      ]
    );
    emailVerificationOtps = mysqlTable(
      "emailVerificationOtps",
      {
        id: int().autoincrement().notNull(),
        email: varchar({ length: 320 }).notNull(),
        otp: varchar({ length: 6 }).notNull(),
        attempts: int().default(0).notNull(),
        expiresAt: timestamp({ mode: "string" }).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("emailVerificationOtps_email_idx").on(table.email),
        index("emailVerificationOtps_expiresAt_idx").on(table.expiresAt)
      ]
    );
    favorites = mysqlTable(
      "favorites",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull().references(() => users.id),
        listingId: int().notNull().references(() => listings.id),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("favorites_user_listing_unique").on(table.userId, table.listingId),
        index("favorites_user_idx").on(table.userId),
        index("favorites_listing_idx").on(table.listingId)
      ]
    );
    forumPosts = mysqlTable(
      "forumPosts",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull().references(() => users.id),
        category: varchar({ length: 64 }).notNull(),
        title: varchar({ length: 255 }).notNull(),
        content: text().notNull(),
        isPinned: tinyint().default(0).notNull(),
        isLocked: tinyint().default(0).notNull(),
        isSolved: tinyint().default(0).notNull(),
        viewCount: int().default(0).notNull(),
        replyCount: int().default(0).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        index("forumPosts_userId_idx").on(table.userId),
        index("forumPosts_category_idx").on(table.category),
        index("forumPosts_isPinned_idx").on(table.isPinned),
        index("forumPosts_createdAt_idx").on(table.createdAt)
      ]
    );
    forumReplies = mysqlTable(
      "forumReplies",
      {
        id: int().autoincrement().notNull(),
        postId: int().notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
        userId: int().notNull().references(() => users.id),
        content: text().notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        index("forumReplies_postId_idx").on(table.postId),
        index("forumReplies_userId_idx").on(table.userId),
        index("forumReplies_createdAt_idx").on(table.createdAt)
      ]
    );
    inquiryReplies = mysqlTable(
      "inquiryReplies",
      {
        id: int().autoincrement().notNull(),
        inquiryId: int().notNull().references(() => itemInquiries.id),
        senderId: int().notNull().references(() => users.id),
        message: text().notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
        recipientId: int().notNull(),
        isRead: tinyint().default(0).notNull()
      },
      (table) => [
        index("inquiryReplies_inquiry_idx").on(table.inquiryId),
        index("inquiryReplies_sender_idx").on(table.senderId)
      ]
    );
    itemInquiries = mysqlTable(
      "itemInquiries",
      {
        id: int().autoincrement().notNull(),
        senderId: int().notNull().references(() => users.id),
        recipientId: int().notNull().references(() => users.id),
        listingId: int().notNull().references(() => listings.id),
        subject: varchar({ length: 255 }).notNull(),
        message: text().notNull(),
        isRead: tinyint().default(0).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
        deletedAt: timestamp({ mode: "string" }),
        senderIsRead: tinyint().default(0).notNull(),
        recipientIsRead: tinyint().default(0).notNull()
      },
      (table) => [
        index("itemInquiries_sender_idx").on(table.senderId),
        index("itemInquiries_recipient_idx").on(table.recipientId),
        index("itemInquiries_listing_idx").on(table.listingId),
        index("itemInquiries_recipient_unread_idx").on(table.recipientId, table.isRead)
      ]
    );
    listingPhotos = mysqlTable(
      "listingPhotos",
      {
        id: int().autoincrement().notNull(),
        listingId: int().notNull().references(() => listings.id),
        fileKey: varchar({ length: 255 }).notNull(),
        imageUrl: text().notNull(),
        altText: varchar({ length: 180 }),
        sortOrder: int().default(0).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("listingPhotos_listing_idx").on(table.listingId)
      ]
    );
    listings = mysqlTable(
      "listings",
      {
        id: int().autoincrement().notNull(),
        ownerId: int().notNull().references(() => users.id),
        title: varchar({ length: 160 }).notNull(),
        category: mysqlEnum(["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins"]).notNull(),
        condition: mysqlEnum(["mint", "near_mint", "excellent", "very_good", "good", "fair", "poor"]).notNull(),
        grade: decimal({ precision: 5, scale: 2 }).default("0").notNull(),
        certificationCompany: varchar({ length: 50 }),
        estimatedValue: decimal({ precision: 12, scale: 2 }),
        description: text().notNull(),
        status: mysqlEnum(["active", "traded", "archived"]).default("active").notNull(),
        isActive: tinyint().default(1).notNull(),
        featured: tinyint().default(0).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
        itemDetails: text(),
        viewCount: int().default(0).notNull(),
        itemType: varchar({ length: 50 }).notNull(),
        signatures: text(),
        certificationNumber: varchar({ length: 100 })
      },
      (table) => [
        index("listings_owner_idx").on(table.ownerId),
        index("listings_category_idx").on(table.category),
        index("listings_condition_idx").on(table.condition),
        index("listings_status_idx").on(table.status),
        index("listings_itemType_idx").on(table.itemType)
      ]
    );
    lowFeedbackFlags = mysqlTable(
      "lowFeedbackFlags",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull().references(() => users.id),
        feedbackScore: int().notNull(),
        feedbackPercentage: decimal({ precision: 5, scale: 2 }).notNull(),
        flaggedReason: text(),
        status: mysqlEnum(["pending", "reviewed", "dismissed", "action_taken"]).default("pending").notNull(),
        adminNotes: text(),
        flaggedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        reviewedAt: timestamp({ mode: "string" }),
        reviewedBy: int().references(() => users.id)
      },
      (table) => [
        index("lowFeedbackFlags_userId_idx").on(table.userId),
        index("lowFeedbackFlags_status_idx").on(table.status),
        index("lowFeedbackFlags_flaggedAt_idx").on(table.flaggedAt)
      ]
    );
    passwordResetTokens = mysqlTable(
      "passwordResetTokens",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull().references(() => users.id, { onDelete: "cascade" }),
        token: varchar({ length: 255 }).notNull(),
        expiresAt: timestamp({ mode: "string" }).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("passwordResetTokens_token_unique").on(table.token),
        index("passwordResetTokens_user_idx").on(table.userId),
        index("passwordResetTokens_expiresAt_idx").on(table.expiresAt)
      ]
    );
    phoneVerificationOtps = mysqlTable(
      "phoneVerificationOtps",
      {
        id: int().autoincrement().notNull(),
        phone: varchar({ length: 20 }).notNull(),
        otp: varchar({ length: 6 }).notNull(),
        attempts: int().default(0).notNull(),
        expiresAt: timestamp({ mode: "string" }).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("phoneVerificationOtps_phone_idx").on(table.phone),
        index("phoneVerificationOtps_expiresAt_idx").on(table.expiresAt)
      ]
    );
    referralRequests = mysqlTable(
      "referralRequests",
      {
        id: int().autoincrement().notNull(),
        referrerId: int().notNull().references(() => users.id),
        referrerEmail: varchar({ length: 320 }).notNull(),
        referrerFirstName: varchar({ length: 255 }).notNull(),
        referrerLastName: varchar({ length: 255 }).notNull(),
        collectorName: varchar({ length: 255 }).notNull(),
        collectorEmail: varchar({ length: 320 }).notNull(),
        collectorFocus: varchar({ length: 255 }).notNull(),
        message: text().notNull(),
        status: mysqlEnum(["pending", "reviewed", "approved", "rejected"]).default("pending").notNull(),
        adminNotes: text(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        reviewedAt: timestamp({ mode: "string" }),
        reviewedBy: int().references(() => users.id),
        emailSent: tinyint().default(0).notNull(),
        emailSentAt: timestamp({ mode: "string" }),
        hasJoined: tinyint().default(0).notNull(),
        joinedAt: timestamp({ mode: "string" }),
        joinedUserId: int().references(() => users.id),
        isMerchant: tinyint().default(0).notNull()
      },
      (table) => [
        index("referralRequests_referrer_idx").on(table.referrerId),
        index("referralRequests_status_idx").on(table.status),
        index("referralRequests_createdAt_idx").on(table.createdAt),
        index("referralRequests_emailSent_idx").on(table.emailSent),
        index("referralRequests_hasJoined_idx").on(table.hasJoined)
      ]
    );
    tradeMessages = mysqlTable(
      "tradeMessages",
      {
        id: int().autoincrement().notNull(),
        proposalId: int().notNull().references(() => tradeProposals.id),
        senderId: int().notNull().references(() => users.id),
        message: text().notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("tradeMessages_proposal_idx").on(table.proposalId),
        index("tradeMessages_sender_idx").on(table.senderId)
      ]
    );
    tradeProposalItems = mysqlTable(
      "tradeProposalItems",
      {
        id: int().autoincrement().notNull(),
        proposalId: int().notNull().references(() => tradeProposals.id),
        offeredListingId: int().notNull().references(() => listings.id),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("tradeProposalItems_unique_item").on(table.proposalId, table.offeredListingId),
        index("tradeProposalItems_proposal_idx").on(table.proposalId),
        index("tradeProposalItems_offeredListing_idx").on(table.offeredListingId)
      ]
    );
    tradeProposals = mysqlTable(
      "tradeProposals",
      {
        id: int().autoincrement().notNull(),
        requesterId: int().notNull().references(() => users.id),
        recipientId: int().notNull().references(() => users.id),
        requestedListingId: int().notNull().references(() => listings.id),
        note: text(),
        status: mysqlEnum(["pending", "accepted", "declined", "completed", "cancelled"]).default("pending").notNull(),
        lastProposedBy: int().references(() => users.id),
        // userId of whoever sent the most recent proposal
        respondedAt: timestamp({ mode: "string" }),
        completedAt: timestamp({ mode: "string" }),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        index("tradeProposals_requester_idx").on(table.requesterId),
        index("tradeProposals_recipient_idx").on(table.recipientId),
        index("tradeProposals_requestedListing_idx").on(table.requestedListingId),
        index("tradeProposals_status_idx").on(table.status)
      ]
    );
    tradeReviews = mysqlTable(
      "tradeReviews",
      {
        id: int().autoincrement().notNull(),
        proposalId: int().notNull().references(() => tradeProposals.id),
        reviewerId: int().notNull().references(() => users.id),
        revieweeId: int().notNull().references(() => users.id),
        rating: int().notNull(),
        review: text(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("tradeReviews_unique_reviewer_per_proposal").on(table.proposalId, table.reviewerId),
        index("tradeReviews_proposal_idx").on(table.proposalId),
        index("tradeReviews_reviewer_idx").on(table.reviewerId),
        index("tradeReviews_reviewee_idx").on(table.revieweeId)
      ]
    );
    userProfiles = mysqlTable(
      "userProfiles",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull().references(() => users.id),
        displayName: varchar({ length: 120 }).notNull(),
        firstName: varchar({ length: 100 }),
        lastName: varchar({ length: 100 }),
        avatarUrl: text(),
        avatarKey: varchar({ length: 255 }),
        bio: text(),
        contactFullName: varchar({ length: 160 }),
        contactEmail: varchar({ length: 320 }),
        contactPhone: varchar({ length: 40 }),
        contactAddress: text(),
        contactTown: varchar({ length: 100 }),
        contactState: varchar({ length: 100 }),
        contactZipCode: varchar({ length: 20 }),
        contactCountry: varchar({ length: 100 }),
        acceptedTerms: tinyint().default(0).notNull(),
        isMerchant: tinyint().default(0).notNull(),
        securityQuestion: varchar({ length: 255 }),
        securityAnswer: varchar({ length: 255 }),
        preferredCategories: text(),
        notificationPreferences: text(),
        connectedAccounts: text(),
        showProfile: tinyint().default(1).notNull(),
        hideInventoryValue: tinyint().default(0).notNull(),
        receiveContactRequests: tinyint().default(1).notNull(),
        emailVerified: tinyint().default(0).notNull(),
        phoneVerified: tinyint().default(0).notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        index("userProfiles_userId_unique").on(table.userId)
      ]
    );
    userReports = mysqlTable(
      "userReports",
      {
        id: int().autoincrement().notNull(),
        reportId: varchar({ length: 20 }).notNull(),
        reportedUserId: int().notNull().references(() => users.id),
        reporterUserId: int().notNull().references(() => users.id),
        reason: varchar({ length: 100 }).notNull(),
        description: text().notNull(),
        evidence: text(),
        status: mysqlEnum(["pending", "reviewed", "dismissed", "action_taken"]).default("pending").notNull(),
        adminNotes: text(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
        reviewedAt: timestamp({ mode: "string" }),
        reviewedBy: int().references(() => users.id)
      },
      (table) => [
        index("userReports_reportId_unique").on(table.reportId),
        index("userReports_reportedUserId_idx").on(table.reportedUserId),
        index("userReports_reporterUserId_idx").on(table.reporterUserId),
        index("userReports_status_idx").on(table.status),
        index("userReports_createdAt_idx").on(table.createdAt)
      ]
    );
    users = mysqlTable(
      "users",
      {
        id: int().autoincrement().notNull(),
        openId: varchar({ length: 64 }),
        username: varchar({ length: 64 }),
        passwordHash: varchar({ length: 255 }),
        name: text(),
        email: varchar({ length: 320 }),
        displayName: varchar({ length: 255 }),
        avatarUrl: text(),
        loginMethod: varchar({ length: 64 }),
        role: mysqlEnum(["user", "admin"]).default("user").notNull(),
        securityQuestion: varchar({ length: 255 }),
        securityAnswerHash: varchar({ length: 255 }),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
        lastSignedIn: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        lastActivityAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        ebayUsername: varchar({ length: 64 }),
        ebayUserId: varchar({ length: 64 }),
        ebayFeedbackScore: int(),
        ebayFeedbackPercentage: decimal({ precision: 5, scale: 2 }),
        ebayMemberSince: timestamp({ mode: "string" }),
        ebayConnectedAt: timestamp({ mode: "string" }),
        ebayAccessToken: text(),
        ebayRefreshToken: text(),
        ebayTokenExpiresAt: timestamp({ mode: "string" }),
        isSuspended: tinyint().default(0).notNull(),
        suspendedAt: timestamp({ mode: "string" })
      },
      (table) => [
        index("users_openId_unique").on(table.openId),
        index("users_username_unique").on(table.username)
      ]
    );
    watchlistEntries = mysqlTable(
      "watchlistEntries",
      {
        id: int().autoincrement().notNull(),
        userId: int().notNull().references(() => users.id),
        listingId: int().notNull().references(() => listings.id),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("watchlistEntries_unique_user_listing").on(table.userId, table.listingId),
        index("watchlistEntries_user_idx").on(table.userId),
        index("watchlistEntries_listing_idx").on(table.listingId)
      ]
    );
    conventionCategories = mysqlTable(
      "conventionCategories",
      {
        id: int().autoincrement().notNull(),
        conventionId: int().notNull(),
        category: mysqlEnum(["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins", "all"]).notNull()
      },
      (table) => [
        index("cc_convention_idx").on(table.conventionId),
        index("cc_category_idx").on(table.category)
      ]
    );
    conventions = mysqlTable(
      "conventions",
      {
        id: int().autoincrement().notNull(),
        name: varchar({ length: 255 }).notNull(),
        category: mysqlEnum(["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins", "all"]).notNull().default("all"),
        startDate: varchar({ length: 20 }).notNull(),
        endDate: varchar({ length: 20 }),
        city: varchar({ length: 100 }),
        state: varchar({ length: 100 }),
        country: varchar({ length: 100 }).notNull().default("United States"),
        venue: varchar({ length: 255 }),
        website: varchar({ length: 500 }),
        admission: varchar({ length: 100 }),
        description: text(),
        source: varchar({ length: 100 }).default("user"),
        status: mysqlEnum(["pending", "approved", "rejected"]).notNull().default("pending"),
        submittedBy: int().references(() => users.id),
        approvedBy: int().references(() => users.id),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull()
      },
      (table) => [
        index("conventions_category_idx").on(table.category),
        index("conventions_startDate_idx").on(table.startDate),
        index("conventions_status_idx").on(table.status),
        index("conventions_country_idx").on(table.country)
      ]
    );
  }
});

// server/_core/env.ts
var ENV, EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_REDIRECT_URI;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      get appId() {
        return process.env.VITE_APP_ID ?? "";
      },
      get cookieSecret() {
        return process.env.JWT_SECRET ?? "";
      },
      get jwtSecret() {
        return process.env.JWT_SECRET ?? "";
      },
      get databaseUrl() {
        return process.env.DATABASE_URL ?? "";
      },
      get oAuthServerUrl() {
        return process.env.OAUTH_SERVER_URL ?? "https://api.manus.im";
      },
      get ownerOpenId() {
        return process.env.OWNER_OPEN_ID ?? "";
      },
      get isProduction() {
        return process.env.NODE_ENV === "production";
      },
      get forgeApiUrl() {
        return process.env.BUILT_IN_FORGE_API_URL ?? "";
      },
      get forgeApiKey() {
        return process.env.BUILT_IN_FORGE_API_KEY ?? "";
      },
      get ebayClientId() {
        return process.env.EBAY_CLIENT_ID ?? "";
      },
      get ebayClientSecret() {
        return process.env.EBAY_CLIENT_SECRET ?? "";
      },
      get ebayRedirectUri() {
        return process.env.EBAY_REDIRECT_URI ?? "http://localhost:3000/api/ebay/callback";
      }
    };
    EBAY_CLIENT_ID = ENV.ebayClientId;
    EBAY_CLIENT_SECRET = ENV.ebayClientSecret;
    EBAY_REDIRECT_URI = ENV.ebayRedirectUri;
  }
});

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    console.error(`[storagePut] S3 upload failed: ${uploadResp.status}`);
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  console.log(`[storagePut] Upload successful, URL: /manus-storage/${key}`);
  return { key, url: `/manus-storage/${key}` };
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_env();
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  addForumReply: () => addForumReply,
  addToFavorites: () => addToFavorites,
  adminBulkDeleteListings: () => adminBulkDeleteListings,
  adminDeleteListing: () => adminDeleteListing,
  approveConvention: () => approveConvention,
  bulkDeleteListings: () => bulkDeleteListings,
  bulkUpdateListingStatus: () => bulkUpdateListingStatus,
  checkDuplicateAccountInfo: () => checkDuplicateAccountInfo,
  closeDb: () => closeDb,
  collectibleCategories: () => collectibleCategories,
  createEmailOtp: () => createEmailOtp,
  createForumPost: () => createForumPost,
  createListing: () => createListing,
  createPasswordResetToken: () => createPasswordResetToken,
  createPhoneOtp: () => createPhoneOtp,
  createReferralRequest: () => createReferralRequest,
  createTradeProposal: () => createTradeProposal,
  createUser: () => createUser,
  deleteConvention: () => deleteConvention,
  deleteDraft: () => deleteDraft,
  deleteDraftsOlderThan: () => deleteDraftsOlderThan,
  deleteEmailOtp: () => deleteEmailOtp,
  deleteInquiry: () => deleteInquiry,
  deletePasswordResetToken: () => deletePasswordResetToken,
  deletePhoneOtp: () => deletePhoneOtp,
  emptyDeletedInquiries: () => emptyDeletedInquiries,
  flagLowFeedback: () => flagLowFeedback,
  generateReportId: () => generateReportId,
  getAllReferralRequests: () => getAllReferralRequests,
  getConventions: () => getConventions,
  getDashboardData: () => getDashboardData,
  getDeletedInquiries: () => getDeletedInquiries,
  getDraftById: () => getDraftById,
  getDrafts: () => getDrafts,
  getEmailOtp: () => getEmailOtp,
  getForumPostById: () => getForumPostById,
  getForumPosts: () => getForumPosts,
  getForumReplies: () => getForumReplies,
  getInquiriesByUser: () => getInquiriesByUser,
  getListingDetail: () => getListingDetail,
  getLowFeedbackFlags: () => getLowFeedbackFlags,
  getMarketplaceFeed: () => getMarketplaceFeed,
  getPasswordResetToken: () => getPasswordResetToken,
  getPendingConventions: () => getPendingConventions,
  getPhoneOtp: () => getPhoneOtp,
  getReferralsByIds: () => getReferralsByIds,
  getRepliesByInquiry: () => getRepliesByInquiry,
  getSiteStatistics: () => getSiteStatistics,
  getSuspendedUsers: () => getSuspendedUsers,
  getTopHighestValueItems: () => getTopHighestValueItems,
  getTopMostFavoritedItems: () => getTopMostFavoritedItems,
  getTopMostViewedItems: () => getTopMostViewedItems,
  getUnreadInquiries: () => getUnreadInquiries,
  getUnreadMessageCount: () => getUnreadMessageCount,
  getUnreadNotificationCount: () => getUnreadNotificationCount,
  getUnsentReferrals: () => getUnsentReferrals,
  getUpcomingConventions: () => getUpcomingConventions,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getUserByUsername: () => getUserByUsername,
  getUserEbayFeedback: () => getUserEbayFeedback,
  getUserEbayInfo: () => getUserEbayInfo,
  getUserReportDetails: () => getUserReportDetails,
  getUserReports: () => getUserReports,
  incrementEmailOtpAttempts: () => incrementEmailOtpAttempts,
  incrementPhoneOtpAttempts: () => incrementPhoneOtpAttempts,
  isFavorited: () => isFavorited,
  itemConditions: () => itemConditions,
  leaveTradeReview: () => leaveTradeReview,
  markInquiryAsRead: () => markInquiryAsRead,
  markReferralAsJoined: () => markReferralAsJoined,
  markReferralsAsEmailed: () => markReferralsAsEmailed,
  mysqlNow: () => mysqlNow,
  rejectConvention: () => rejectConvention,
  removeFromFavorites: () => removeFromFavorites,
  removeReferral: () => removeReferral,
  requireDb: () => requireDb,
  respondToTradeProposal: () => respondToTradeProposal,
  restoreDeletedListings: () => restoreDeletedListings,
  saveDraft: () => saveDraft,
  searchMembers: () => searchMembers,
  selectTradeProposalItems: () => selectTradeProposalItems,
  sendInquiryReply: () => sendInquiryReply,
  sendItemInquiry: () => sendItemInquiry,
  sendTradeMessage: () => sendTradeMessage,
  storeEbayFeedback: () => storeEbayFeedback,
  submitConvention: () => submitConvention,
  submitUserReport: () => submitUserReport,
  suspendUser: () => suspendUser,
  toMysqlDateTime: () => toMysqlDateTime,
  toggleListingStatus: () => toggleListingStatus,
  toggleWatchlist: () => toggleWatchlist,
  trackListingView: () => trackListingView,
  unsuspendUser: () => unsuspendUser,
  updateDraft: () => updateDraft,
  updateListing: () => updateListing,
  updateProfile: () => updateProfile,
  updateReferralRequestStatus: () => updateReferralRequestStatus,
  updateReportStatus: () => updateReportStatus,
  updateUserEbayInfo: () => updateUserEbayInfo,
  updateUserPassword: () => updateUserPassword,
  upsertUser: () => upsertUser
});
import { and, asc, desc, eq, inArray, isNotNull, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
function toMysqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
function mysqlNow() {
  return toMysqlDateTime(/* @__PURE__ */ new Date());
}
function safeJsonParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[safeJsonParse] Malformed JSON in database column; using fallback.");
    return fallback;
  }
}
async function closeDb() {
  if (_db) {
    try {
      const client = _db.$client;
      if (client?.end) await client.end();
    } finally {
      _db = null;
    }
  }
}
async function requireDb() {
  if (!_db) {
    const dbUrl = process.env.DATABASE_URL || ENV.databaseUrl;
    const url = new URL(dbUrl);
    const sslParam = url.searchParams.get("ssl");
    if (sslParam) {
      try {
        const sslConfig = JSON.parse(sslParam);
        url.searchParams.delete("ssl");
        _db = drizzle({
          connection: {
            uri: url.toString(),
            ssl: sslConfig
          }
        });
      } catch (e) {
        console.error("[requireDb] Failed to parse SSL config, falling back to default:", e);
        _db = drizzle(dbUrl);
      }
    } else {
      _db = drizzle(dbUrl);
    }
  }
  return _db;
}
function getInsertId(result) {
  let id = 0;
  if (Array.isArray(result) && result[0]?.insertId) {
    id = result[0].insertId;
  } else if (result?.insertId) {
    id = result.insertId;
  } else if (result?.lastInsertRowid) {
    id = result.lastInsertRowid;
  }
  return Number(id);
}
async function ensureUserProfileRecord(user) {
  const db = await requireDb();
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
  if (!existing[0]) {
    await db.insert(userProfiles).values({
      userId: user.id,
      displayName: user.name ?? `Collector ${user.id}`
    });
  }
}
async function uploadImage(folder, userId, input) {
  try {
    const buffer = Buffer.from(input.contentBase64, "base64");
    console.log(`[uploadImage] Starting upload: name=${input.name}, size=${buffer.length} bytes, type=${input.type}`);
    const timestamp2 = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const sanitizedName = input.name.replace(/\s+/g, "-");
    const fileKey = `${folder}/${userId}/${timestamp2}-${randomId}-${sanitizedName}`;
    console.log(`[uploadImage] File key: ${fileKey}`);
    console.log(`[uploadImage] Original name: ${input.name}, Sanitized name: ${sanitizedName}`);
    const result = await storagePut(fileKey, buffer, input.type);
    console.log(`[uploadImage] Upload successful, URL: ${result.url}`);
    return result;
  } catch (error) {
    console.error(`[uploadImage] Upload failed:`, error);
    throw error;
  }
}
async function getProfileMap(userIds) {
  if (userIds.length === 0) return /* @__PURE__ */ new Map();
  const db = await requireDb();
  const profiles = await db.select({
    userId: userProfiles.userId,
    displayName: userProfiles.displayName,
    avatarUrl: userProfiles.avatarUrl,
    firstName: userProfiles.firstName,
    lastName: userProfiles.lastName
  }).from(userProfiles).where(inArray(userProfiles.userId, userIds));
  return new Map(profiles.map((p) => [p.userId, p]));
}
async function getRatingStatsMap(userIds) {
  if (userIds.length === 0) return /* @__PURE__ */ new Map();
  const db = await requireDb();
  const stats = await db.select({
    revieweeId: tradeReviews.revieweeId,
    averageRating: sql`avg(${tradeReviews.rating})`,
    reviewCount: sql`count(*)`
  }).from(tradeReviews).where(inArray(tradeReviews.revieweeId, userIds)).groupBy(tradeReviews.revieweeId);
  return new Map(
    stats.map((s) => [
      s.revieweeId,
      {
        averageRating: Number(s.averageRating ?? 0),
        reviewCount: Number(s.reviewCount ?? 0)
      }
    ])
  );
}
async function formatListings(listingRows, viewerId) {
  if (listingRows.length === 0) return [];
  const ownerIds = Array.from(new Set(listingRows.map((r) => r.ownerId)));
  const profileMap = await getProfileMap(ownerIds);
  const ratingMap = await getRatingStatsMap(ownerIds);
  const watchlistRows = viewerId ? await (await requireDb()).select({ listingId: watchlistEntries.listingId }).from(watchlistEntries).where(and(eq(watchlistEntries.userId, viewerId), inArray(watchlistEntries.listingId, listingRows.map((r) => r.id)))) : [];
  const savedListingIds = new Set(watchlistRows.map((r) => r.listingId));
  return listingRows.map((row) => ({
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    category: row.category,
    condition: row.condition,
    grade: row.grade ?? null,
    certificationCompany: row.certificationCompany ?? null,
    estimatedValue: row.estimatedValue ? Number(row.estimatedValue) : null,
    description: row.description,
    status: row.status,
    featured: row.featured,
    isActive: row.isActive,
    createdAt: new Date(row.createdAt).getTime(),
    updatedAt: new Date(row.updatedAt).getTime(),
    owner: {
      id: row.ownerId,
      displayName: profileMap.get(row.ownerId)?.displayName ?? `Collector ${row.ownerId}`,
      firstName: profileMap.get(row.ownerId)?.firstName ?? null,
      lastName: profileMap.get(row.ownerId)?.lastName ?? null,
      avatarUrl: profileMap.get(row.ownerId)?.avatarUrl ?? null
    },
    ownerRating: ratingMap.get(row.ownerId) ?? { averageRating: 0, reviewCount: 0 },
    primaryPhotoUrl: row.primaryPhotoUrl ?? null,
    photos: row.primaryPhotoUrl ? [row.primaryPhotoUrl] : [],
    categoryLabel: categoryLabels[row.category] ?? row.category,
    conditionLabel: conditionLabels[row.condition] ?? row.condition,
    savedToWatchlist: savedListingIds.has(row.id),
    viewCount: row.viewCount ?? 0,
    favoriteCount: row.favoriteCount ?? 0
  }));
}
async function getMarketplaceFeed(filters, viewerId) {
  const db = await requireDb();
  const whereClauses = [eq(listings.status, "active"), eq(listings.isActive, 1)];
  if (filters.category) {
    whereClauses.push(eq(listings.category, filters.category));
  }
  if (filters.condition) {
    whereClauses.push(
      sql`(${eq(listings.condition, filters.condition)} OR ${listings.grade} > 0)`
    );
  }
  const keyword = filters.keyword?.trim();
  if (keyword) {
    const searchCondition = or(
      like(listings.title, `%${keyword}%`),
      like(listings.description, `%${keyword}%`),
      like(listings.certificationCompany, `%${keyword}%`),
      sql`${listings.itemDetails} LIKE ${`%${keyword}%`}`,
      sql`CAST(${listings.grade} AS CHAR) LIKE ${`%${keyword}%`}`,
      like(listings.certificationNumber, `%${keyword}%`)
    );
    if (searchCondition !== void 0) {
      whereClauses.push(searchCondition);
    }
  }
  const jsonLike = (key, value) => sql`JSON_UNQUOTE(JSON_EXTRACT(${listings.itemDetails}, ${`$.${key}`})) LIKE ${`%${value.trim()}%`}`;
  const jsonLikeAny = (keys, value) => {
    const conditions = keys.map((key) => jsonLike(key, value));
    return sql.join(conditions, sql` OR `);
  };
  if (filters.issueNumber?.trim()) {
    whereClauses.push(sql`(${jsonLike("issueNumber", filters.issueNumber)})`);
  }
  if (filters.manufacturer?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["manufacturer", "customManufacturer"], filters.manufacturer)})`);
  }
  if (filters.year?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["year", "releaseYear", "publicationYear", "yearsIncluded"], filters.year)})`);
  }
  if (filters.team?.trim()) {
    whereClauses.push(sql`(${jsonLike("player", filters.team)} OR ${like(listings.title, `%${filters.team.trim()}%`)} OR ${like(listings.description, `%${filters.team.trim()}%`)})`);
  }
  if (filters.series?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["setName", "set", "series"], filters.series)})`);
  }
  if (filters.title?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["comicTitle", "gameTitle", "title"], filters.title)} OR ${like(listings.title, `%${filters.title.trim()}%`)})`);
  }
  if (filters.system?.trim()) {
    whereClauses.push(sql`(${jsonLike("platform", filters.system)})`);
  }
  if (filters.region?.trim()) {
    whereClauses.push(sql`(${jsonLike("region", filters.region)})`);
  }
  if (filters.country?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["country", "countriesIncluded"], filters.country)})`);
  }
  if (filters.format?.trim()) {
    whereClauses.push(sql`(${jsonLike("format", filters.format)})`);
  }
  if (filters.medium?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["signedItemType", "autographCategory"], filters.medium)})`);
  }
  if (filters.denomination?.trim()) {
    whereClauses.push(sql`(${jsonLike("denomination", filters.denomination)})`);
  }
  if (filters.mintMark?.trim()) {
    whereClauses.push(sql`(${jsonLike("mintMark", filters.mintMark)})`);
  }
  if (filters.issuer?.trim()) {
    whereClauses.push(sql`(${jsonLike("country", filters.issuer)} OR ${like(listings.title, `%${filters.issuer.trim()}%`)} OR ${like(listings.description, `%${filters.issuer.trim()}%`)})`);
  }
  if (filters.edition?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["limitedEdition", "openEdition", "backstampInformation"], filters.edition)} OR ${like(listings.title, `%${filters.edition.trim()}%`)} OR ${like(listings.description, `%${filters.edition.trim()}%`)})`);
  }
  if (filters.parkOrEvent?.trim()) {
    whereClauses.push(sql`(${jsonLike("pinTradingEvent", filters.parkOrEvent)})`);
  }
  if (filters.franchise?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["franchise", "series"], filters.franchise)} OR ${like(listings.title, `%${filters.franchise.trim()}%`)} OR ${like(listings.description, `%${filters.franchise.trim()}%`)})`);
  }
  if (filters.rarity?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["rarity", "customRarity"], filters.rarity)})`);
  }
  if (filters.sport?.trim()) {
    whereClauses.push(sql`(${jsonLike("sport", filters.sport)})`);
  }
  const jsonBoolMatch = (keys, value) => {
    const lowered = value.trim().toLowerCase();
    const synonyms = lowered === "yes" || lowered === "true" ? ["yes", "true"] : lowered === "no" || lowered === "false" ? ["no", "false"] : [lowered];
    const conditions = keys.flatMap(
      (key) => synonyms.map((v) => sql`LOWER(JSON_UNQUOTE(JSON_EXTRACT(${listings.itemDetails}, ${`$.${key}`}))) = ${v}`)
    );
    return sql.join(conditions, sql` OR `);
  };
  if (filters.rookie?.trim() && filters.rookie !== "All") {
    whereClauses.push(sql`(${jsonBoolMatch(["rookieCard", "rookie"], filters.rookie)})`);
  }
  if (filters.autographed?.trim() && filters.autographed !== "All") {
    whereClauses.push(sql`(${jsonBoolMatch(["autograph", "autographed"], filters.autographed)})`);
  }
  if (filters.signed?.trim() && filters.signed !== "All") {
    whereClauses.push(sql`(${jsonBoolMatch(["signed"], filters.signed)})`);
  }
  if (filters.facsimile?.trim() && filters.facsimile !== "All") {
    whereClauses.push(sql`(${jsonBoolMatch(["facsimile"], filters.facsimile)} OR ${sql`${listings.signatures} LIKE ${`%facsimile%`}`})`);
  }
  if (filters.gradingService) {
    whereClauses.push(like(listings.certificationCompany, `%${filters.gradingService}%`));
  }
  if (filters.grade && filters.grade !== "All") {
    whereClauses.push(eq(listings.grade, filters.grade));
  }
  if (filters.valueMin !== void 0) {
    whereClauses.push(sql`CAST(${listings.estimatedValue} AS DECIMAL(12,2)) >= ${filters.valueMin}`);
  }
  if (filters.valueMax !== void 0) {
    whereClauses.push(sql`CAST(${listings.estimatedValue} AS DECIMAL(12,2)) <= ${filters.valueMax}`);
  }
  const listingRows = await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    status: listings.status,
    featured: listings.featured,
    isActive: listings.isActive,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
    primaryPhotoUrl: sql`(
        select imageUrl from listingPhotos where listingId = listings.id order by sortOrder asc limit 1
      )`
  }).from(listings).where(and(...whereClauses)).orderBy(desc(listings.createdAt)).limit(100);
  if (!listingRows.length) {
    return {
      filters: {
        categories: collectibleCategories.map((value) => ({ value, label: categoryLabels[value] })),
        conditions: itemConditions.map((value) => ({ value, label: conditionLabels[value] }))
      },
      highlights: {
        totalListings: 0,
        activeCollectors: 0,
        completedTrades: 0
      },
      listings: []
    };
  }
  const statsRows = await Promise.all([
    db.select({ value: sql`count(*)` }).from(listings).where(and(...whereClauses)),
    db.select({ value: sql`count(distinct ${listings.ownerId})` }).from(listings).where(and(...whereClauses)),
    db.select({ value: sql`count(*)` }).from(tradeProposals).where(eq(tradeProposals.status, "completed"))
  ]);
  return {
    filters: {
      categories: collectibleCategories.map((value) => ({ value, label: categoryLabels[value] })),
      conditions: itemConditions.map((value) => ({ value, label: conditionLabels[value] }))
    },
    highlights: {
      totalListings: Number(statsRows[0][0]?.value ?? 0),
      activeCollectors: Number(statsRows[1][0]?.value ?? 0),
      completedTrades: Number(statsRows[2][0]?.value ?? 0)
    },
    listings: await formatListings(listingRows, viewerId)
  };
}
async function getSiteStatistics() {
  const db = await requireDb();
  const totalListingsResult = await db.select({ value: sql`count(*)` }).from(listings).where(eq(listings.status, "active"));
  const totalCollectorsResult = await db.select({ value: sql`count(*)` }).from(users);
  const totalValueResult = await db.select({ value: sql`coalesce(sum(cast(estimatedValue as decimal(12,2))), 0)` }).from(listings).where(eq(listings.status, "active"));
  const totalTradesResult = await db.select({ value: sql`count(*)` }).from(tradeProposals).where(eq(tradeProposals.status, "completed"));
  return {
    totalMembers: Number(totalCollectorsResult[0]?.value ?? 0),
    totalItems: Number(totalListingsResult[0]?.value ?? 0),
    totalValue: Number(totalValueResult[0]?.value ?? 0),
    totalTrades: Number(totalTradesResult[0]?.value ?? 0)
  };
}
async function getProposalCards(userId) {
  const db = await requireDb();
  const proposalRows = await db.select({
    id: tradeProposals.id,
    requesterId: tradeProposals.requesterId,
    recipientId: tradeProposals.recipientId,
    requestedListingId: tradeProposals.requestedListingId,
    note: tradeProposals.note,
    status: tradeProposals.status,
    respondedAt: tradeProposals.respondedAt,
    completedAt: tradeProposals.completedAt,
    createdAt: tradeProposals.createdAt
  }).from(tradeProposals).where(or(eq(tradeProposals.requesterId, userId), eq(tradeProposals.recipientId, userId))).orderBy(desc(tradeProposals.createdAt));
  const listingIds = Array.from(new Set(
    proposalRows.map((p) => p.requestedListingId).filter(Boolean)
  ));
  const listingRows = listingIds.length ? await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    status: listings.status,
    featured: listings.featured,
    isActive: listings.isActive,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt
  }).from(listings).where(inArray(listings.id, listingIds)) : [];
  const listingMap = new Map(listingRows.map((l) => [l.id, l]));
  const proposalIds = proposalRows.map((p) => p.id);
  const messageRows = proposalIds.length ? await db.select({
    id: tradeMessages.id,
    proposalId: tradeMessages.proposalId,
    senderId: tradeMessages.senderId,
    message: tradeMessages.message,
    createdAt: tradeMessages.createdAt
  }).from(tradeMessages).where(inArray(tradeMessages.proposalId, proposalIds)).orderBy(asc(tradeMessages.createdAt)) : [];
  const messagesMap = /* @__PURE__ */ new Map();
  messageRows.forEach((msg) => {
    if (!messagesMap.has(msg.proposalId)) {
      messagesMap.set(msg.proposalId, []);
    }
    messagesMap.get(msg.proposalId).push(msg);
  });
  return proposalRows.map((p) => ({
    id: p.id,
    requesterId: p.requesterId,
    recipientId: p.recipientId,
    requestedListing: listingMap.get(p.requestedListingId) ?? null,
    note: p.note,
    status: p.status,
    respondedAt: p.respondedAt ? new Date(p.respondedAt).getTime() : null,
    completedAt: p.completedAt ? new Date(p.completedAt).getTime() : null,
    createdAt: new Date(p.createdAt).getTime(),
    updatedAt: p.respondedAt ? new Date(p.respondedAt).getTime() : new Date(p.createdAt).getTime(),
    direction: p.requesterId === userId ? "outgoing" : "incoming",
    canReview: p.status === "completed",
    canRespond: p.status === "pending" && p.recipientId === userId,
    offeredListings: [],
    counterpart: null,
    requesterInventory: [],
    canAcceptSelection: p.status === "pending" && p.recipientId === userId,
    contactDetails: null,
    messages: (messagesMap.get(p.id) ?? []).map((msg) => ({
      id: msg.id,
      proposalId: msg.proposalId,
      senderId: msg.senderId,
      message: msg.message,
      createdAt: new Date(msg.createdAt).getTime()
    })),
    canCancel: p.status === "pending",
    canComplete: p.status === "accepted"
  }));
}
async function getListingDetail(listingId, viewerId) {
  const db = await requireDb();
  const detailCard = await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    itemType: listings.itemType,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    certificationNumber: listings.certificationNumber,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    itemDetails: listings.itemDetails,
    signatures: listings.signatures,
    status: listings.status,
    featured: listings.featured,
    isActive: listings.isActive,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt
  }).from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!detailCard[0]) {
    throw new Error("Listing not found.");
  }
  const ownerProfileRows = await db.select({
    bio: userProfiles.bio,
    displayName: userProfiles.displayName,
    avatarUrl: userProfiles.avatarUrl
  }).from(userProfiles).where(eq(userProfiles.userId, detailCard[0].ownerId)).limit(1);
  const similarRows = await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    certificationNumber: listings.certificationNumber,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    signatures: listings.signatures,
    status: listings.status,
    featured: listings.featured,
    isActive: listings.isActive,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt
  }).from(listings).where(and(eq(listings.category, detailCard[0].category), ne(listings.id, listingId), eq(listings.status, "active"))).orderBy(desc(listings.createdAt)).limit(6);
  const similarListingIds = similarRows.map((r) => r.id);
  const similarPhotosRows = similarListingIds.length > 0 ? await db.select({
    listingId: listingPhotos.listingId,
    imageUrl: listingPhotos.imageUrl
  }).from(listingPhotos).where(and(inArray(listingPhotos.listingId, similarListingIds), eq(listingPhotos.sortOrder, 0))) : [];
  const similarPhotosMap = new Map(similarPhotosRows.map((p) => [p.listingId, p.imageUrl]));
  const similarRowsWithPhotos = similarRows.map((row) => ({
    ...row,
    primaryPhotoUrl: similarPhotosMap.get(row.id) ?? null
  }));
  const photoRows = await db.select({
    imageUrl: listingPhotos.imageUrl,
    altText: listingPhotos.altText,
    sortOrder: listingPhotos.sortOrder
  }).from(listingPhotos).where(eq(listingPhotos.listingId, listingId)).orderBy(asc(listingPhotos.sortOrder));
  const isSaved = viewerId ? (await db.select().from(watchlistEntries).where(and(eq(watchlistEntries.userId, viewerId), eq(watchlistEntries.listingId, listingId))).limit(1)).length > 0 : false;
  const ratingMap = await getRatingStatsMap([detailCard[0].ownerId]);
  const ownerRating = ratingMap.get(detailCard[0].ownerId) ?? { averageRating: 0, reviewCount: 0 };
  return {
    id: detailCard[0].id,
    ownerId: detailCard[0].ownerId,
    title: detailCard[0].title,
    category: detailCard[0].category,
    itemType: detailCard[0].itemType,
    condition: detailCard[0].condition,
    grade: detailCard[0].grade,
    certificationCompany: detailCard[0].certificationCompany,
    certificationNumber: detailCard[0].certificationNumber,
    estimatedValue: detailCard[0].estimatedValue ? Number(detailCard[0].estimatedValue) : null,
    description: detailCard[0].description,
    itemDetails: safeJsonParse(detailCard[0].itemDetails, null),
    signatures: safeJsonParse(detailCard[0].signatures, null),
    status: detailCard[0].status,
    featured: detailCard[0].featured,
    isActive: detailCard[0].isActive,
    createdAt: new Date(detailCard[0].createdAt).getTime(),
    updatedAt: new Date(detailCard[0].updatedAt).getTime(),
    ownerProfile: {
      displayName: ownerProfileRows[0]?.displayName ?? `Collector ${detailCard[0].ownerId}`,
      bio: ownerProfileRows[0]?.bio ?? "Open to thoughtful, collector-to-collector trades.",
      avatarUrl: ownerProfileRows[0]?.avatarUrl ?? null
    },
    ownerRating,
    photos: photoRows.map((p) => ({
      imageUrl: p.imageUrl,
      altText: p.altText
    })),
    primaryPhotoUrl: photoRows.length > 0 ? photoRows[0].imageUrl : null,
    similarListings: await formatListings(similarRowsWithPhotos, viewerId),
    savedToWatchlist: isSaved
  };
}
async function createTradeProposal(user, input) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);
  const requestedListing = await db.select().from(listings).where(eq(listings.id, input.requestedListingId)).limit(1);
  if (!requestedListing[0]) {
    throw new Error("The requested listing could not be found.");
  }
  if (requestedListing[0].ownerId === user.id) {
    throw new Error("You cannot create a Trade Proposal for your own listing.");
  }
  if (requestedListing[0].status !== "active") {
    throw new Error("The requested listing is no longer available for trade.");
  }
  const proposalInsert = await db.insert(tradeProposals).values({
    requesterId: user.id,
    recipientId: requestedListing[0].ownerId,
    requestedListingId: input.requestedListingId,
    note: input.note?.trim() ? input.note.trim().slice(0, 1e3) : null
  });
  const proposalId = getInsertId(proposalInsert);
  return {
    proposalId,
    requestedListing: await getListingDetail(input.requestedListingId, user.id)
  };
}
async function selectTradeProposalItems(user, input) {
  const db = await requireDb();
  const proposal = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }
  if (proposal[0].requesterId !== user.id) {
    throw new Error("You can only select items for your own proposals.");
  }
  if (proposal[0].status !== "pending") {
    throw new Error("You can only select items for pending proposals.");
  }
  if (input.selectedListingIds.length > 0) {
    const ownedRows = await db.select({ id: listings.id, ownerId: listings.ownerId }).from(listings).where(inArray(listings.id, input.selectedListingIds));
    const ownedMap = new Map(ownedRows.map((r) => [r.id, r.ownerId]));
    for (const listingId of input.selectedListingIds) {
      const ownerId = ownedMap.get(listingId);
      if (ownerId === void 0) throw new Error(`Listing ${listingId} not found.`);
      if (ownerId !== user.id) throw new Error(`You don't own listing ${listingId}.`);
    }
  }
  await db.transaction(async (tx) => {
    await tx.delete(tradeProposalItems).where(eq(tradeProposalItems.proposalId, input.proposalId));
    if (input.selectedListingIds.length > 0) {
      await tx.insert(tradeProposalItems).values(
        input.selectedListingIds.map((listingId) => ({
          proposalId: input.proposalId,
          offeredListingId: listingId
        }))
      );
    }
  });
  return { success: true };
}
async function respondToTradeProposal(user, input) {
  const db = await requireDb();
  const proposal = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }
  if (proposal[0].recipientId !== user.id) {
    throw new Error("You can only respond to proposals sent to you.");
  }
  if (proposal[0].status !== "pending") {
    throw new Error("This proposal has already been responded to.");
  }
  const newStatus = input.response === "accepted" ? "accepted" : "declined";
  await db.transaction(async (tx) => {
    await tx.update(tradeProposals).set({
      status: newStatus,
      respondedAt: mysqlNow()
    }).where(eq(tradeProposals.id, input.proposalId));
    if (input.response === "accepted") {
      const proposalItems = await tx.select().from(tradeProposalItems).where(eq(tradeProposalItems.proposalId, input.proposalId));
      const listingIds = proposalItems.map((item) => item.offeredListingId);
      listingIds.push(proposal[0].requestedListingId);
      await tx.update(listings).set({ status: "traded" }).where(inArray(listings.id, listingIds));
    }
  });
  return { success: true };
}
async function toggleWatchlist(userId, listingId) {
  const db = await requireDb();
  const listing = await db.select({ ownerId: listings.ownerId }).from(listings).where(eq(listings.id, listingId)).limit(1);
  if (listing[0] && listing[0].ownerId === userId) {
    throw new Error("You cannot favorite your own items");
  }
  const existing = await db.select().from(watchlistEntries).where(and(eq(watchlistEntries.userId, userId), eq(watchlistEntries.listingId, listingId))).limit(1);
  const isSaved = !existing[0];
  if (existing[0]) {
    await db.delete(watchlistEntries).where(and(eq(watchlistEntries.userId, userId), eq(watchlistEntries.listingId, listingId)));
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
  } else {
    await db.insert(watchlistEntries).values({
      userId,
      listingId
    });
    await db.insert(favorites).values({
      userId,
      listingId
    });
  }
  return { saved: isSaved };
}
async function leaveTradeReview(user, input) {
  const db = await requireDb();
  const proposal = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }
  if (proposal[0].status !== "completed") {
    throw new Error("You can only review completed trades.");
  }
  const revieweeId = proposal[0].requesterId === user.id ? proposal[0].recipientId : proposal[0].requesterId;
  await db.insert(tradeReviews).values({
    proposalId: input.proposalId,
    reviewerId: user.id,
    revieweeId,
    rating: Math.max(1, Math.min(5, input.rating)),
    review: input.review?.trim() ? input.review.trim().slice(0, 1e3) : null
  });
  return { success: true };
}
async function sendTradeMessage(user, input) {
  const db = await requireDb();
  const proposal = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }
  const isParticipant = proposal[0].requesterId === user.id || proposal[0].recipientId === user.id;
  if (!isParticipant) {
    throw new Error("You are not part of this trade proposal.");
  }
  await db.insert(tradeMessages).values({
    proposalId: input.proposalId,
    senderId: user.id,
    message: input.message.trim().slice(0, 2e3)
  });
  return { success: true };
}
async function searchMembers(input) {
  const db = await requireDb();
  const whereClauses = [];
  if (input.query?.trim()) {
    whereClauses.push(like(userProfiles.displayName, `%${input.query.trim()}%`));
  }
  if (input.region?.trim()) {
    whereClauses.push(like(userProfiles.contactAddress, `%${input.region.trim()}%`));
  }
  const members = await db.select({
    userId: userProfiles.userId,
    displayName: userProfiles.displayName,
    avatarUrl: userProfiles.avatarUrl,
    bio: userProfiles.bio,
    contactAddress: userProfiles.contactAddress
  }).from(userProfiles).where(whereClauses.length > 0 ? and(...whereClauses) : void 0).limit(50);
  const ratingMap = await getRatingStatsMap(members.map((m) => m.userId));
  const listingCountsResult = await db.select({
    ownerId: listings.ownerId,
    count: sql`count(*)`
  }).from(listings).where(eq(listings.status, "active")).groupBy(listings.ownerId);
  const listingCountMap = new Map(listingCountsResult.map((r) => [r.ownerId, Number(r.count)]));
  const completedTradesResult = await db.select({
    revieweeId: tradeReviews.revieweeId,
    count: sql`count(*)`
  }).from(tradeReviews).groupBy(tradeReviews.revieweeId);
  const completedTradesMap = new Map(completedTradesResult.map((r) => [r.revieweeId, Number(r.count)]));
  const topCategoriesResult = await db.select({
    ownerId: listings.ownerId,
    category: listings.category,
    count: sql`count(*)`
  }).from(listings).where(eq(listings.status, "active")).groupBy(listings.ownerId, listings.category).orderBy(desc(sql`count(*)`));
  const topCategoriesMap = /* @__PURE__ */ new Map();
  for (const result of topCategoriesResult) {
    if (!topCategoriesMap.has(result.ownerId)) {
      topCategoriesMap.set(result.ownerId, []);
    }
    topCategoriesMap.get(result.ownerId).push(result.category);
  }
  const formattedMembers = members.map((m) => {
    const rating = ratingMap.get(m.userId) ?? { averageRating: 0, reviewCount: 0 };
    return {
      userId: m.userId,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      bio: m.bio,
      region: m.contactAddress,
      regionLabel: m.contactAddress ?? "Unknown",
      rating,
      averageRating: rating.averageRating,
      reviewCount: rating.reviewCount,
      listingCount: listingCountMap.get(m.userId) ?? 0,
      completedTradeCount: completedTradesMap.get(m.userId) ?? 0,
      topCategories: topCategoriesMap.get(m.userId) ?? [],
      verificationLevel: "Verified",
      online: false
    };
  });
  const topRated = formattedMembers.sort((a, b) => (b.rating?.averageRating ?? 0) - (a.rating?.averageRating ?? 0)).slice(0, 10);
  const mostActive = formattedMembers.sort((a, b) => b.listingCount + b.completedTradeCount - (a.listingCount + a.completedTradeCount)).slice(0, 10);
  const uniqueRegions = Array.from(new Set(formattedMembers.map((m) => m.region).filter(Boolean)));
  return {
    members: formattedMembers,
    rankings: { topRated, mostActive },
    topRated,
    mostActive,
    regions: uniqueRegions
  };
}
async function toggleListingStatus(user, input) {
  const db = await requireDb();
  const listing = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
  if (!listing[0]) {
    throw new Error("Listing not found.");
  }
  if (listing[0].ownerId !== user.id) {
    throw new Error("You can only toggle your own listings.");
  }
  await db.update(listings).set({ isActive: input.isActive ? 1 : 0 }).where(eq(listings.id, input.listingId));
  return getDashboardData(user);
}
async function bulkUpdateListingStatus(user, input) {
  const db = await requireDb();
  console.log("[bulkUpdateListingStatus] user.id:", user.id, "listingIds:", input.listingIds, "isActive:", input.isActive);
  const listings_to_update = await db.select({ id: listings.id, ownerId: listings.ownerId }).from(listings).where(inArray(listings.id, input.listingIds));
  console.log("[bulkUpdateListingStatus] listings_to_update:", listings_to_update);
  for (const listing of listings_to_update) {
    if (listing.ownerId !== user.id) {
      console.error("[bulkUpdateListingStatus] Authorization failed: listing.ownerId:", listing.ownerId, "user.id:", user.id);
      throw new Error("You can only update your own listings.");
    }
  }
  await db.update(listings).set({ isActive: input.isActive ? 1 : 0 }).where(inArray(listings.id, input.listingIds));
  return getDashboardData(user);
}
async function bulkDeleteListings(user, input) {
  const db = await requireDb();
  const listings_to_delete = await db.select({ id: listings.id, ownerId: listings.ownerId }).from(listings).where(inArray(listings.id, input.listingIds));
  for (const listing of listings_to_delete) {
    if (listing.ownerId !== user.id) {
      throw new Error("You can only delete your own listings.");
    }
  }
  for (const listing of listings_to_delete) {
    const [acceptedTrades] = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM tradeProposals WHERE requestedListingId = ${listing.id} AND status IN ('accepted', 'shipped')`
    );
    const [acceptedOffered] = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM tradeProposalItems tpi JOIN tradeProposals tp ON tp.id = tpi.proposalId WHERE tpi.offeredListingId = ${listing.id} AND tp.status IN ('accepted', 'shipped')`
    );
    if (acceptedTrades?.[0]?.cnt > 0 || acceptedOffered?.[0]?.cnt > 0) {
      throw new Error(`Cannot delete item "${listing.id}": it is part of an accepted trade. Cancel the trade first.`);
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
  for (const listing of listings_to_delete) {
    await db.execute(
      sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Trade cancelled: Item is no longer available.', updatedAt = ${now} WHERE requestedListingId = ${listing.id} AND status IN ('pending', 'negotiating')`
    );
    await db.execute(
      sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Trade cancelled: An offered item is no longer available.', updatedAt = ${now} WHERE status IN ('pending', 'negotiating') AND id IN (SELECT proposalId FROM tradeProposalItems WHERE offeredListingId = ${listing.id})`
    );
  }
  await db.transaction(async (tx) => {
    await tx.delete(listingPhotos).where(inArray(listingPhotos.listingId, input.listingIds));
    await tx.delete(listings).where(inArray(listings.id, input.listingIds));
  });
  return getDashboardData(user);
}
async function restoreDeletedListings(user, input) {
  const db = await requireDb();
  const listings_to_restore = await db.select({ id: listings.id, ownerId: listings.ownerId }).from(listings).where(inArray(listings.id, input.listingIds));
  for (const listing of listings_to_restore) {
    if (listing.ownerId !== user.id) {
      throw new Error("You can only restore your own listings.");
    }
  }
  await db.update(listings).set({ isActive: 1 }).where(inArray(listings.id, input.listingIds));
  return getDashboardData(user);
}
async function getUnreadNotificationCount(userId) {
  return { count: 0 };
}
async function getUnreadMessageCount(userId) {
  const db = await requireDb();
  const inquiryResult = await db.select({ count: sql`count(*)` }).from(itemInquiries).where(
    and(
      eq(itemInquiries.recipientId, userId),
      eq(itemInquiries.isRead, 0)
    )
  );
  const inquiryCount = Number(inquiryResult[0]?.count ?? 0);
  return { count: inquiryCount };
}
async function saveDraft(user, input) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);
  const insertResult = await db.insert(draftListings).values({
    userId: user.id,
    title: input.title.trim(),
    category: input.category,
    grade: String(input.grade || "ungraded"),
    graderCompany: input.graderCompany || null,
    certificationNumber: input.certificationNumber || null,
    estimatedValue: input.estimatedValue ? String(parseFloat(String(input.estimatedValue))) : null
  });
  const draftId = getInsertId(insertResult);
  for (let index2 = 0; index2 < input.photos.length; index2 += 1) {
    const photo = input.photos[index2];
    const uploaded = await uploadImage("drafts", user.id, photo);
    await db.insert(listingPhotos).values({
      listingId: draftId,
      fileKey: uploaded.key,
      imageUrl: uploaded.url,
      altText: `${input.title.trim()} draft photo ${index2 + 1}`,
      sortOrder: index2
    });
  }
  return { draftId };
}
async function getDrafts(user) {
  const db = await requireDb();
  const draftRows = await db.select({
    id: draftListings.id,
    title: draftListings.title,
    category: draftListings.category,
    grade: draftListings.grade,
    graderCompany: draftListings.graderCompany,
    certificationNumber: draftListings.certificationNumber,
    estimatedValue: draftListings.estimatedValue,
    categoryFields: draftListings.categoryFields,
    additionalNotes: draftListings.additionalNotes,
    createdAt: draftListings.createdAt
  }).from(draftListings).where(eq(draftListings.userId, user.id)).orderBy(desc(draftListings.createdAt));
  const photoRows = await db.select({
    draftId: sql`listingId`,
    imageUrl: listingPhotos.imageUrl,
    altText: listingPhotos.altText,
    sortOrder: listingPhotos.sortOrder
  }).from(listingPhotos).where(inArray(listingPhotos.listingId, draftRows.map((d) => d.id)));
  const photoMap = /* @__PURE__ */ new Map();
  for (const photo of photoRows) {
    if (!photoMap.has(photo.draftId)) {
      photoMap.set(photo.draftId, []);
    }
    photoMap.get(photo.draftId).push({
      imageUrl: photo.imageUrl,
      altText: photo.altText
    });
  }
  return draftRows.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    grade: d.grade,
    graderCompany: d.graderCompany,
    certificationNumber: d.certificationNumber,
    estimatedValue: d.estimatedValue ? Number(d.estimatedValue) : null,
    categoryFields: safeJsonParse(d.categoryFields, {}),
    additionalNotes: d.additionalNotes,
    photos: photoMap.get(d.id) ?? [],
    createdAt: new Date(d.createdAt).getTime()
  }));
}
async function deleteDraft(user, input) {
  const db = await requireDb();
  const draft = await db.select().from(draftListings).where(eq(draftListings.id, input.draftId)).limit(1);
  if (!draft[0]) {
    throw new Error("Draft not found.");
  }
  if (draft[0].userId !== user.id) {
    throw new Error("You can only delete your own drafts.");
  }
  await db.delete(draftListings).where(eq(draftListings.id, input.draftId));
  await db.delete(listingPhotos).where(eq(listingPhotos.listingId, input.draftId));
  return { success: true };
}
async function getDraftById(user, draftId) {
  const db = await requireDb();
  const draftRow = await db.select().from(draftListings).where(eq(draftListings.id, draftId)).limit(1);
  if (!draftRow[0]) {
    throw new Error("Draft not found.");
  }
  if (draftRow[0].userId !== user.id) {
    throw new Error("You can only access your own drafts.");
  }
  const photoRows = await db.select({
    imageUrl: listingPhotos.imageUrl,
    altText: listingPhotos.altText,
    sortOrder: listingPhotos.sortOrder
  }).from(listingPhotos).where(eq(listingPhotos.listingId, draftId)).orderBy(asc(listingPhotos.sortOrder));
  const draft = draftRow[0];
  return {
    id: draft.id,
    title: draft.title,
    category: draft.category,
    grade: draft.grade,
    graderCompany: draft.graderCompany,
    certificationNumber: draft.certificationNumber,
    estimatedValue: draft.estimatedValue ? Number(draft.estimatedValue) : null,
    categoryFields: safeJsonParse(draft.categoryFields, {}),
    additionalNotes: draft.additionalNotes,
    photos: photoRows.map((p) => ({
      imageUrl: p.imageUrl,
      altText: p.altText
    })),
    createdAt: new Date(draft.createdAt).getTime()
  };
}
async function updateDraft(user, input) {
  const db = await requireDb();
  const draft = await db.select().from(draftListings).where(eq(draftListings.id, input.draftId)).limit(1);
  if (!draft[0]) {
    throw new Error("Draft not found.");
  }
  if (draft[0].userId !== user.id) {
    throw new Error("You can only update your own drafts.");
  }
  await db.update(draftListings).set({
    title: input.title.trim(),
    category: input.category,
    grade: String(input.grade || "ungraded"),
    graderCompany: input.graderCompany || null,
    certificationNumber: input.certificationNumber || null,
    estimatedValue: input.estimatedValue ? String(parseFloat(String(input.estimatedValue))) : null,
    categoryFields: input.categoryFields ? JSON.stringify(input.categoryFields) : null,
    additionalNotes: input.additionalNotes || null,
    updatedAt: mysqlNow()
  }).where(eq(draftListings.id, input.draftId));
  await db.delete(listingPhotos).where(eq(listingPhotos.listingId, input.draftId));
  for (let index2 = 0; index2 < input.photos.length; index2 += 1) {
    const photo = input.photos[index2];
    const uploaded = await uploadImage("drafts", user.id, photo);
    await db.insert(listingPhotos).values({
      listingId: input.draftId,
      fileKey: uploaded.key,
      imageUrl: uploaded.url,
      altText: `${input.title.trim()} draft photo ${index2 + 1}`,
      sortOrder: index2
    });
  }
  return { draftId: input.draftId };
}
async function getDashboardData(user) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);
  const profileQuery = db.select({
    displayName: userProfiles.displayName,
    firstName: userProfiles.firstName,
    lastName: userProfiles.lastName,
    avatarUrl: userProfiles.avatarUrl,
    bio: userProfiles.bio,
    contactFullName: userProfiles.contactFullName,
    contactEmail: userProfiles.contactEmail,
    contactPhone: userProfiles.contactPhone,
    contactAddress: userProfiles.contactAddress,
    contactTown: userProfiles.contactTown,
    contactState: userProfiles.contactState,
    contactZipCode: userProfiles.contactZipCode,
    contactCountry: userProfiles.contactCountry,
    securityQuestion: userProfiles.securityQuestion,
    preferredCategories: userProfiles.preferredCategories,
    showProfile: userProfiles.showProfile,
    hideInventoryValue: userProfiles.hideInventoryValue,
    receiveContactRequests: userProfiles.receiveContactRequests,
    notificationPreferences: userProfiles.notificationPreferences
  }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
  const [profileRows, ownListingRows, watchlistRows, receivedReviews, proposalCards, ratingMapData] = await Promise.all([
    profileQuery,
    db.select({
      id: listings.id,
      ownerId: listings.ownerId,
      title: listings.title,
      category: listings.category,
      condition: listings.condition,
      grade: listings.grade,
      certificationCompany: listings.certificationCompany,
      estimatedValue: listings.estimatedValue,
      description: listings.description,
      status: listings.status,
      featured: listings.featured,
      isActive: listings.isActive,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt
    }).from(listings).where(eq(listings.ownerId, user.id)).orderBy(desc(listings.createdAt)),
    db.select({ listingId: watchlistEntries.listingId }).from(watchlistEntries).where(eq(watchlistEntries.userId, user.id)),
    db.select({
      id: tradeReviews.id,
      proposalId: tradeReviews.proposalId,
      reviewerId: tradeReviews.reviewerId,
      rating: tradeReviews.rating,
      review: tradeReviews.review,
      createdAt: tradeReviews.createdAt
    }).from(tradeReviews).where(eq(tradeReviews.revieweeId, user.id)).orderBy(desc(tradeReviews.createdAt)),
    getProposalCards(user.id),
    getRatingStatsMap([user.id])
  ]);
  const ownListingIds = ownListingRows.map((r) => r.id);
  const ownPhotos = ownListingIds.length ? await db.select({
    listingId: listingPhotos.listingId,
    imageUrl: listingPhotos.imageUrl,
    sortOrder: listingPhotos.sortOrder
  }).from(listingPhotos).where(inArray(listingPhotos.listingId, ownListingIds)).orderBy(asc(listingPhotos.sortOrder)) : [];
  const ownPhotosMap = /* @__PURE__ */ new Map();
  ownPhotos.forEach((photo) => {
    if (!ownPhotosMap.has(photo.listingId)) {
      ownPhotosMap.set(photo.listingId, photo.imageUrl);
    }
  });
  const enrichedOwnListings = ownListingRows.map((row) => ({
    ...row,
    primaryPhotoUrl: ownPhotosMap.get(row.id) || null
  }));
  const ownListings = await formatListings(enrichedOwnListings, user.id);
  const savedListingIds = watchlistRows.map((row) => row.listingId);
  const savedListingRows = savedListingIds.length ? await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    status: listings.status,
    featured: listings.featured,
    isActive: listings.isActive,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt
  }).from(listings).where(inArray(listings.id, savedListingIds)).orderBy(desc(listings.createdAt)) : [];
  const watchlistPhotos = savedListingIds.length ? await db.select({
    listingId: listingPhotos.listingId,
    imageUrl: listingPhotos.imageUrl,
    sortOrder: listingPhotos.sortOrder
  }).from(listingPhotos).where(inArray(listingPhotos.listingId, savedListingIds)).orderBy(asc(listingPhotos.sortOrder)) : [];
  const watchlistPhotosMap = /* @__PURE__ */ new Map();
  watchlistPhotos.forEach((photo) => {
    if (!watchlistPhotosMap.has(photo.listingId)) {
      watchlistPhotosMap.set(photo.listingId, photo.imageUrl);
    }
  });
  const enrichedWatchlistRows = savedListingRows.map((row) => ({
    ...row,
    primaryPhotoUrl: watchlistPhotosMap.get(row.id) || null
  }));
  const reviewProfileMap = await getProfileMap(receivedReviews.map((row) => row.reviewerId));
  const watchlist = await formatListings(enrichedWatchlistRows, user.id);
  const rating = ratingMapData.get(user.id) ?? { averageRating: 0, reviewCount: 0 };
  const profileData = profileRows[0];
  return {
    profile: {
      displayName: profileData?.displayName ?? user.name ?? `Collector ${user.id}`,
      firstName: profileData?.firstName ?? "",
      lastName: profileData?.lastName ?? "",
      avatarUrl: profileData?.avatarUrl ?? null,
      bio: profileData?.bio ?? "Open to thoughtful, collector-to-collector trades.",
      contactFullName: profileData?.contactFullName ?? user.name ?? "",
      contactEmail: profileData?.contactEmail ?? "",
      contactPhone: profileData?.contactPhone ?? "",
      contactAddress: profileData?.contactAddress ?? "",
      // @ts-ignore - Drizzle type inference issue
      contactTown: profileData?.contactTown ?? "",
      // @ts-ignore - Drizzle type inference issue
      contactState: profileData?.contactState ?? "",
      // @ts-ignore - Drizzle type inference issue
      contactZipCode: profileData?.contactZipCode ?? "",
      // @ts-ignore - Drizzle type inference issue
      contactCountry: profileData?.contactCountry ?? "",
      securityQuestion: profileData?.securityQuestion ?? "",
      preferredCategories: profileData?.preferredCategories ?? null,
      showProfile: profileData?.showProfile ?? true,
      hideInventoryValue: profileData?.hideInventoryValue ?? false,
      receiveContactRequests: profileData?.receiveContactRequests ?? true,
      notificationPreferences: profileData?.notificationPreferences ?? null,
      rating,
      tradeHistoryCount: proposalCards.length
    },
    ownListings,
    watchlist,
    tradeProposals: proposalCards,
    tradeHistory: proposalCards,
    ratingsAndReviews: receivedReviews.map((review) => {
      const reviewer = reviewProfileMap.get(review.reviewerId) ?? {
        userId: review.reviewerId,
        displayName: `Collector ${review.reviewerId}`,
        avatarUrl: null
      };
      return {
        id: review.id,
        proposalId: review.proposalId,
        rating: review.rating,
        review: review.review ?? "",
        createdAt: new Date(review.createdAt).getTime(),
        reviewer
      };
    })
  };
}
async function updateProfile(user, input) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);
  const updateSet = {
    displayName: input.displayName.trim().slice(0, 120),
    bio: input.bio?.trim() ? input.bio.trim() : null,
    contactFullName: input.contactFullName?.trim() ? input.contactFullName.trim().slice(0, 160) : null,
    contactEmail: input.contactEmail?.trim() ? input.contactEmail.trim().slice(0, 320) : null,
    contactPhone: input.contactPhone?.trim() ? input.contactPhone.trim().slice(0, 40) : null,
    contactAddress: input.contactAddress?.trim() ? input.contactAddress.trim().slice(0, 320) : null,
    contactTown: input.contactTown?.trim() ? input.contactTown.trim().slice(0, 100) : null,
    contactState: input.contactState?.trim() ? input.contactState.trim().slice(0, 100) : null,
    contactZipCode: input.contactZipCode?.trim() ? input.contactZipCode.trim().slice(0, 20) : null,
    contactCountry: input.contactCountry?.trim() ? input.contactCountry.trim().slice(0, 100) : null
  };
  if (input.firstName !== void 0) {
    updateSet.firstName = input.firstName?.trim() ? input.firstName.trim().slice(0, 100) : null;
  }
  if (input.lastName !== void 0) {
    updateSet.lastName = input.lastName?.trim() ? input.lastName.trim().slice(0, 100) : null;
  }
  if (input.avatar) {
    try {
      const uploaded = await uploadImage("avatars", user.id, input.avatar);
      updateSet.avatarKey = uploaded.key;
      updateSet.avatarUrl = uploaded.url;
    } catch (error) {
      console.error("[updateProfile] Upload failed, skipping avatar update:", error);
    }
  }
  if (input.acceptedTerms !== void 0) {
    updateSet.acceptedTerms = input.acceptedTerms;
  }
  if (input.isMerchant !== void 0) {
    updateSet.isMerchant = input.isMerchant;
  }
  if (input.securityQuestion !== void 0) {
    updateSet.securityQuestion = input.securityQuestion?.trim() ? input.securityQuestion.trim().slice(0, 255) : null;
  }
  if (input.securityAnswer !== void 0) {
    updateSet.securityAnswer = input.securityAnswer?.trim() ? input.securityAnswer.trim().slice(0, 255) : null;
  }
  if (input.preferredCategories !== void 0) {
    updateSet.preferredCategories = input.preferredCategories ? JSON.stringify(input.preferredCategories) : null;
  }
  if (input.notificationPreferences !== void 0) {
    updateSet.notificationPreferences = input.notificationPreferences ? JSON.stringify(input.notificationPreferences) : null;
  }
  if (input.emailVerified !== void 0) {
    updateSet.emailVerified = input.emailVerified;
  }
  if (input.phoneVerified !== void 0) {
    updateSet.phoneVerified = input.phoneVerified;
  }
  console.log("[updateProfile] Updating database...");
  await db.update(userProfiles).set(updateSet).where(eq(userProfiles.userId, user.id));
  console.log("[updateProfile] Database updated, calling getDashboardData...");
  const result = await getDashboardData(user);
  console.log("[updateProfile] getDashboardData completed, returning result");
  return result;
}
async function createListing(user, input) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);
  const insertResult = await db.insert(listings).values({
    ownerId: user.id,
    title: input.title.trim(),
    category: input.category,
    itemType: input.itemType,
    condition: input.condition,
    description: input.description.trim(),
    estimatedValue: input.estimatedValue ? String(parseFloat(String(input.estimatedValue))) : null,
    itemDetails: input.itemDetails ? JSON.stringify(input.itemDetails) : null,
    certificationCompany: input.certificationCompany || void 0,
    certificationNumber: input.certificationNumber || void 0,
    grade: input.grade && input.grade !== "ungraded" && input.grade.trim() ? String(input.grade) : "0",
    featured: 0
  });
  const listingId = getInsertId(insertResult);
  for (let index2 = 0; index2 < input.photos.length; index2 += 1) {
    const photo = input.photos[index2];
    const uploaded = await uploadImage("listings", user.id, photo);
    await db.insert(listingPhotos).values({
      listingId,
      fileKey: uploaded.key,
      imageUrl: uploaded.url,
      altText: `${input.title.trim()} photo ${index2 + 1}`,
      sortOrder: index2
    });
  }
  return getDashboardData(user);
}
async function updateListing(user, input) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);
  const listing = await db.select({ ownerId: listings.ownerId }).from(listings).where(eq(listings.id, input.listingId)).limit(1);
  if (!listing[0] || listing[0].ownerId !== user.id) {
    throw new Error("Unauthorized: You can only edit your own listings");
  }
  const userRecord = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1);
  const isAdmin = userRecord[0]?.role === "admin";
  if (!isAdmin) {
    const existingPhotos = await db.select({ imageUrl: listingPhotos.imageUrl }).from(listingPhotos).where(eq(listingPhotos.listingId, input.listingId));
    const existingUrls = new Set(existingPhotos.map((p) => p.imageUrl));
    const incomingUrls = new Set(input.photos.map((p) => p.imageUrl).filter(Boolean));
    for (const url of Array.from(existingUrls)) {
      if (!incomingUrls.has(url)) {
        throw new Error("Unauthorized: Only admins can delete photos from listings");
      }
    }
  }
  await db.update(listings).set({
    title: input.title.trim(),
    category: input.category,
    condition: input.condition,
    description: input.description.trim(),
    estimatedValue: input.estimatedValue ? String(parseFloat(String(input.estimatedValue))) : null,
    itemDetails: input.itemDetails ? JSON.stringify(input.itemDetails) : null,
    certificationCompany: input.certificationCompany || null,
    certificationNumber: input.certificationNumber || null,
    grade: input.grade && input.grade !== "ungraded" && input.grade.trim() ? String(input.grade) : "0"
  }).where(eq(listings.id, input.listingId));
  await db.transaction(async (tx) => {
    if (isAdmin) {
      await tx.delete(listingPhotos).where(eq(listingPhotos.listingId, input.listingId));
    } else {
      const photosToDelete = input.photos.filter((p) => p.contentBase64).map((p) => p.imageUrl).filter((url) => Boolean(url));
      if (photosToDelete.length > 0) {
        await tx.delete(listingPhotos).where(
          and(
            eq(listingPhotos.listingId, input.listingId),
            inArray(listingPhotos.imageUrl, photosToDelete)
          )
        );
      }
    }
    for (let index2 = 0; index2 < input.photos.length; index2 += 1) {
      const photo = input.photos[index2];
      let imageUrl = photo.imageUrl;
      let fileKey = "existing";
      if (photo.contentBase64) {
        const uploaded = await uploadImage("listings", user.id, {
          name: photo.name,
          type: photo.type,
          contentBase64: photo.contentBase64
        });
        imageUrl = uploaded.url;
        fileKey = uploaded.key;
      }
      if (imageUrl) {
        await tx.insert(listingPhotos).values({
          listingId: input.listingId,
          fileKey,
          imageUrl,
          altText: `${input.title.trim()} photo ${index2 + 1}`,
          sortOrder: index2
        });
      }
    }
  });
  return getDashboardData(user);
}
async function upsertUser(input) {
  const db = await requireDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.openId, input.openId)).limit(1);
  if (existing[0]) {
    await db.update(users).set({
      name: input.name,
      email: input.email,
      loginMethod: input.loginMethod,
      lastSignedIn: toMysqlDateTime(
        typeof input.lastSignedIn === "string" ? new Date(input.lastSignedIn) : input.lastSignedIn || /* @__PURE__ */ new Date()
      )
    }).where(eq(users.openId, input.openId));
    return existing[0].id;
  } else {
    const result = await db.insert(users).values({
      openId: input.openId,
      name: input.name,
      email: input.email,
      loginMethod: input.loginMethod,
      lastSignedIn: input.lastSignedIn ? toMysqlDateTime(
        typeof input.lastSignedIn === "string" ? new Date(input.lastSignedIn) : input.lastSignedIn
      ) : void 0
    });
    return getInsertId(result);
  }
}
async function getUserById(id) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}
async function getUserByOpenId(openId) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] || null;
}
async function getUserByUsername(username) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0] || null;
}
async function createUser(input) {
  const db = await requireDb();
  const result = await db.insert(users).values({
    username: input.username,
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    email: input.email || null,
    loginMethod: "custom"
  });
  return getInsertId(result);
}
async function createPasswordResetToken(userId, token, expiresAt) {
  const db = await requireDb();
  return db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt: toMysqlDateTime(expiresAt)
  });
}
async function getPasswordResetToken(token) {
  const db = await requireDb();
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  return result[0] || null;
}
async function deletePasswordResetToken(token) {
  const db = await requireDb();
  return db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
}
async function updateUserPassword(userId, passwordHash) {
  const db = await requireDb();
  return db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
async function createEmailOtp(email, otp, expiresAt) {
  const db = await requireDb();
  await db.delete(emailVerificationOtps).where(eq(emailVerificationOtps.email, email));
  return db.insert(emailVerificationOtps).values({
    email,
    otp,
    expiresAt: toMysqlDateTime(expiresAt)
  });
}
async function createPhoneOtp(phone, otp, expiresAt) {
  const db = await requireDb();
  await db.delete(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone));
  return db.insert(phoneVerificationOtps).values({
    phone,
    otp,
    expiresAt: toMysqlDateTime(expiresAt)
  });
}
async function getEmailOtp(email) {
  const db = await requireDb();
  const result = await db.select().from(emailVerificationOtps).where(eq(emailVerificationOtps.email, email)).limit(1);
  return result[0] || null;
}
async function getPhoneOtp(phone) {
  const db = await requireDb();
  const result = await db.select().from(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone)).limit(1);
  return result[0] || null;
}
async function deleteEmailOtp(email) {
  const db = await requireDb();
  return db.delete(emailVerificationOtps).where(eq(emailVerificationOtps.email, email));
}
async function deletePhoneOtp(phone) {
  const db = await requireDb();
  return db.delete(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone));
}
async function incrementEmailOtpAttempts(email) {
  const db = await requireDb();
  return db.update(emailVerificationOtps).set({ attempts: sql`attempts + 1` }).where(eq(emailVerificationOtps.email, email));
}
async function incrementPhoneOtpAttempts(phone) {
  const db = await requireDb();
  return db.update(phoneVerificationOtps).set({ attempts: sql`attempts + 1` }).where(eq(phoneVerificationOtps.phone, phone));
}
async function checkDuplicateAccountInfo(userId, email, phone, fullName, address) {
  const db = await requireDb();
  if (email && email.trim()) {
    const existingEmail = await db.select({ userId: userProfiles.userId }).from(userProfiles).where(and(
      eq(userProfiles.contactEmail, email),
      ne(userProfiles.userId, userId)
    )).limit(1);
    if (existingEmail.length > 0) {
      return {
        isDuplicate: true,
        field: "email",
        message: "An account with this email address already exists. Users are not allowed to have multiple accounts."
      };
    }
  }
  if (phone && phone.trim()) {
    const existingPhone = await db.select({ userId: userProfiles.userId }).from(userProfiles).where(and(
      eq(userProfiles.contactPhone, phone),
      ne(userProfiles.userId, userId)
    )).limit(1);
    if (existingPhone.length > 0) {
      return {
        isDuplicate: true,
        field: "phone",
        message: "An account with this phone number already exists. Users are not allowed to have multiple accounts."
      };
    }
  }
  if (fullName && address && fullName.trim() && address.trim()) {
    const existingNameAddress = await db.select({ userId: userProfiles.userId, contactAddress: userProfiles.contactAddress }).from(userProfiles).where(and(
      eq(userProfiles.contactFullName, fullName),
      eq(userProfiles.contactAddress, address),
      ne(userProfiles.userId, userId)
    )).limit(1);
    if (existingNameAddress.length > 0) {
      return {
        isDuplicate: true,
        field: "nameAddress",
        message: "An account with this name and address already exists. Users are not allowed to have multiple accounts."
      };
    }
  }
  return { isDuplicate: false };
}
async function generateReportId() {
  const db = await requireDb();
  const lastReport = await db.select().from(userReports).orderBy(desc(userReports.id)).limit(1);
  const nextNumber = (lastReport[0]?.id ?? 0) + 1;
  return `RPT-${String(nextNumber).padStart(6, "0")}`;
}
async function submitUserReport(input) {
  const db = await requireDb();
  const reportId = await generateReportId();
  await db.insert(userReports).values({
    reportId,
    reportedUserId: input.reportedUserId,
    reporterUserId: input.reporterUserId,
    reason: input.reason,
    description: input.description,
    evidence: input.evidence,
    status: "pending"
  });
  return { reportId };
}
async function getUserReports(options = {}) {
  const db = await requireDb();
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const whereClauses = [];
  if (options.status) {
    whereClauses.push(eq(userReports.status, options.status));
  }
  const results = await db.select({
    id: userReports.id,
    reportId: userReports.reportId,
    reportedUserId: userReports.reportedUserId,
    reportedUserName: users.username,
    reportedUserDisplayName: users.displayName,
    reporterUserId: userReports.reporterUserId,
    reporterUserName: sql`(SELECT username FROM users WHERE id = ${userReports.reporterUserId})`,
    reason: userReports.reason,
    status: userReports.status,
    createdAt: userReports.createdAt
  }).from(userReports).innerJoin(users, eq(userReports.reportedUserId, users.id)).where(whereClauses.length > 0 ? and(...whereClauses) : void 0).orderBy(desc(userReports.createdAt)).limit(limit).offset(offset);
  return results;
}
async function getUserReportDetails(reportId) {
  const db = await requireDb();
  const report = await db.select().from(userReports).where(eq(userReports.reportId, reportId)).limit(1);
  if (!report[0]) return null;
  const reportedUser = await db.select().from(users).where(eq(users.id, report[0].reportedUserId)).limit(1);
  const reporterUser = await db.select().from(users).where(eq(users.id, report[0].reporterUserId)).limit(1);
  let reviewedByUser = null;
  if (report[0].reviewedBy) {
    const result = await db.select().from(users).where(eq(users.id, report[0].reviewedBy)).limit(1);
    reviewedByUser = result[0];
  }
  return {
    id: report[0].id,
    reportId: report[0].reportId,
    reportedUserId: report[0].reportedUserId,
    reportedUserName: reportedUser[0]?.username ?? "",
    reportedUserDisplayName: reportedUser[0]?.displayName ?? "",
    reportedUserEmail: reportedUser[0]?.email ?? "",
    reporterUserId: report[0].reporterUserId,
    reporterUserName: reporterUser[0]?.username ?? "",
    reporterUserDisplayName: reporterUser[0]?.displayName ?? "",
    reason: report[0].reason,
    description: report[0].description,
    evidence: report[0].evidence ?? void 0,
    status: report[0].status,
    adminNotes: report[0].adminNotes ?? void 0,
    createdAt: new Date(report[0].createdAt),
    updatedAt: new Date(report[0].updatedAt),
    reviewedAt: report[0].reviewedAt ? new Date(report[0].reviewedAt) : void 0,
    reviewedBy: report[0].reviewedBy ?? void 0,
    reviewedByName: reviewedByUser?.username ?? void 0
  };
}
async function updateReportStatus(input) {
  const db = await requireDb();
  await db.update(userReports).set({
    status: input.status,
    adminNotes: input.adminNotes,
    reviewedAt: mysqlNow(),
    reviewedBy: input.reviewedBy
  }).where(eq(userReports.reportId, input.reportId));
}
async function updateUserEbayInfo(input) {
  const db = await requireDb();
  await db.update(users).set({
    ebayUsername: input.ebayUsername,
    ebayUserId: input.ebayUserId,
    ebayFeedbackScore: input.ebayFeedbackScore,
    ebayFeedbackPercentage: input.ebayFeedbackPercentage.toString(),
    ebayMemberSince: input.ebayMemberSince ? toMysqlDateTime(input.ebayMemberSince) : void 0,
    ebayConnectedAt: mysqlNow(),
    ebayAccessToken: input.ebayAccessToken,
    ebayRefreshToken: input.ebayRefreshToken,
    ebayTokenExpiresAt: input.ebayTokenExpiresAt ? toMysqlDateTime(input.ebayTokenExpiresAt) : void 0
  }).where(eq(users.id, input.userId));
}
async function getUserEbayInfo(userId) {
  const db = await requireDb();
  const user = await db.select({
    ebayUsername: users.ebayUsername,
    ebayUserId: users.ebayUserId,
    ebayFeedbackScore: users.ebayFeedbackScore,
    ebayFeedbackPercentage: users.ebayFeedbackPercentage,
    ebayMemberSince: users.ebayMemberSince,
    ebayConnectedAt: users.ebayConnectedAt
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return null;
  return {
    ...user[0],
    ebayFeedbackPercentage: user[0].ebayFeedbackPercentage ? parseFloat(user[0].ebayFeedbackPercentage) : null,
    // Timestamp columns are string-mode; convert at the boundary to keep the
    // declared Date-based API contract.
    ebayMemberSince: user[0].ebayMemberSince ? new Date(user[0].ebayMemberSince) : null,
    ebayConnectedAt: user[0].ebayConnectedAt ? new Date(user[0].ebayConnectedAt) : null
  };
}
async function storeEbayFeedback(input) {
  const db = await requireDb();
  await db.insert(ebayFeedbackHistory).values({
    ...input,
    feedbackDate: toMysqlDateTime(input.feedbackDate)
  });
}
async function getUserEbayFeedback(userId) {
  const db = await requireDb();
  const feedback = await db.select().from(ebayFeedbackHistory).where(eq(ebayFeedbackHistory.userId, userId)).orderBy(desc(ebayFeedbackHistory.feedbackDate));
  return feedback;
}
async function flagLowFeedback(input) {
  const db = await requireDb();
  const existing = await db.select().from(lowFeedbackFlags).where(and(
    eq(lowFeedbackFlags.userId, input.userId),
    eq(lowFeedbackFlags.status, "pending")
  )).limit(1);
  if (!existing[0]) {
    await db.insert(lowFeedbackFlags).values({
      userId: input.userId,
      feedbackScore: input.feedbackScore,
      feedbackPercentage: input.feedbackPercentage.toString(),
      flaggedReason: input.flaggedReason
    });
  }
}
async function getLowFeedbackFlags() {
  const db = await requireDb();
  const flags = await db.select().from(lowFeedbackFlags).where(eq(lowFeedbackFlags.status, "pending")).orderBy(desc(lowFeedbackFlags.flaggedAt));
  return flags;
}
async function sendItemInquiry(user, input) {
  const db = await requireDb();
  if (!input.subject.trim() || input.subject.length > 255) {
    throw new Error("Subject must be between 1 and 255 characters");
  }
  if (!input.message.trim() || input.message.length > 5e3) {
    throw new Error("Message must be between 1 and 5000 characters");
  }
  const listing = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, input.listingId)).limit(1);
  if (!listing[0]) {
    throw new Error("Listing not found");
  }
  const recipient = await db.select({ id: users.id }).from(users).where(eq(users.id, input.recipientId)).limit(1);
  if (!recipient[0]) {
    throw new Error("Recipient not found");
  }
  const result = await db.insert(itemInquiries).values({
    listingId: input.listingId,
    senderId: user.id,
    recipientId: input.recipientId,
    subject: input.subject.trim(),
    message: input.message.trim(),
    isRead: 0,
    createdAt: mysqlNow()
  });
  return { id: getInsertId(result), success: true };
}
async function getUnreadInquiries(userId) {
  const db = await requireDb();
  const inquiries = await db.select().from(itemInquiries).where(
    and(
      eq(itemInquiries.recipientId, userId),
      eq(itemInquiries.isRead, 0)
    )
  ).orderBy(desc(itemInquiries.createdAt));
  return inquiries;
}
async function getInquiriesByUser(userId, limit = 50, offset = 0) {
  const db = await requireDb();
  const inquiries = await db.select({
    id: itemInquiries.id,
    senderId: itemInquiries.senderId,
    senderName: users.displayName,
    senderAvatarUrl: users.avatarUrl,
    recipientId: itemInquiries.recipientId,
    listingId: itemInquiries.listingId,
    subject: itemInquiries.subject,
    message: itemInquiries.message,
    isRead: itemInquiries.isRead,
    createdAt: itemInquiries.createdAt,
    updatedAt: itemInquiries.updatedAt,
    deletedAt: itemInquiries.deletedAt
  }).from(itemInquiries).innerJoin(users, eq(itemInquiries.senderId, users.id)).where(
    or(
      eq(itemInquiries.recipientId, userId),
      eq(itemInquiries.senderId, userId)
    )
  ).orderBy(desc(itemInquiries.createdAt)).limit(limit).offset(offset);
  return inquiries;
}
async function markInquiryAsRead(inquiryId, userId) {
  const db = await requireDb();
  const inquiry = await db.select({ recipientId: itemInquiries.recipientId }).from(itemInquiries).where(eq(itemInquiries.id, inquiryId)).limit(1);
  if (!inquiry[0] || inquiry[0].recipientId !== userId) {
    throw new Error("Unauthorized: You can only mark your own inquiries as read");
  }
  await db.update(itemInquiries).set({ isRead: 1 }).where(eq(itemInquiries.id, inquiryId));
  return { success: true };
}
async function sendInquiryReply(inquiryId, senderId, message) {
  const db = await requireDb();
  const inquiry = await db.select({ recipientId: itemInquiries.recipientId, senderId: itemInquiries.senderId }).from(itemInquiries).where(eq(itemInquiries.id, inquiryId)).limit(1);
  if (!inquiry[0] || inquiry[0].recipientId !== senderId) {
    throw new Error("Unauthorized: You can only reply to inquiries sent to you");
  }
  const replyRecipient = inquiry[0].senderId;
  await db.insert(inquiryReplies).values({
    inquiryId,
    senderId,
    recipientId: replyRecipient,
    message
  });
  await db.update(itemInquiries).set({ isRead: 0 }).where(eq(itemInquiries.id, inquiryId));
  const newReply = await db.select().from(inquiryReplies).where(and(eq(inquiryReplies.inquiryId, inquiryId), eq(inquiryReplies.senderId, senderId))).orderBy(desc(inquiryReplies.createdAt)).limit(1);
  return newReply[0] || { id: 0, inquiryId, senderId, message, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
}
async function getRepliesByInquiry(inquiryId) {
  const db = await requireDb();
  const replies = await db.select({
    id: inquiryReplies.id,
    inquiryId: inquiryReplies.inquiryId,
    senderId: inquiryReplies.senderId,
    senderName: users.displayName,
    senderAvatarUrl: users.avatarUrl,
    message: inquiryReplies.message,
    createdAt: inquiryReplies.createdAt
  }).from(inquiryReplies).innerJoin(users, eq(inquiryReplies.senderId, users.id)).where(eq(inquiryReplies.inquiryId, inquiryId)).orderBy(asc(inquiryReplies.createdAt));
  return replies;
}
async function deleteInquiry(inquiryId, userId) {
  const db = await requireDb();
  const inquiry = await db.select({ recipientId: itemInquiries.recipientId }).from(itemInquiries).where(eq(itemInquiries.id, inquiryId)).limit(1);
  if (!inquiry[0] || inquiry[0].recipientId !== userId) {
    throw new Error("Unauthorized: You can only delete your own inquiries");
  }
  await db.update(itemInquiries).set({ deletedAt: mysqlNow() }).where(eq(itemInquiries.id, inquiryId));
}
async function getDeletedInquiries(userId) {
  const db = await requireDb();
  const inquiries = await db.select({
    id: itemInquiries.id,
    senderId: itemInquiries.senderId,
    senderName: users.displayName,
    senderAvatarUrl: users.avatarUrl,
    subject: itemInquiries.subject,
    message: itemInquiries.message,
    isRead: itemInquiries.isRead,
    createdAt: itemInquiries.createdAt,
    deletedAt: itemInquiries.deletedAt
  }).from(itemInquiries).innerJoin(users, eq(itemInquiries.senderId, users.id)).where(and(eq(itemInquiries.recipientId, userId), isNotNull(itemInquiries.deletedAt))).orderBy(desc(itemInquiries.deletedAt));
  return inquiries;
}
async function emptyDeletedInquiries(userId) {
  const db = await requireDb();
  await db.delete(itemInquiries).where(and(eq(itemInquiries.recipientId, userId), isNotNull(itemInquiries.deletedAt)));
}
async function createReferralRequest(data) {
  const db = await requireDb();
  const existingRequest = await db.select().from(referralRequests).where(
    and(
      eq(referralRequests.collectorEmail, data.collectorEmail),
      eq(referralRequests.status, "pending")
    )
  ).limit(1);
  if (existingRequest.length > 0) {
    return existingRequest[0];
  }
  const result = await db.insert(referralRequests).values({
    ...data,
    isMerchant: data.isMerchant ? 1 : 0
  });
  return result;
}
async function getAllReferralRequests() {
  const db = await requireDb();
  const requests = await db.select({
    id: referralRequests.id,
    referrerId: referralRequests.referrerId,
    referrerName: sql`CONCAT(${referralRequests.referrerFirstName}, ' ', ${referralRequests.referrerLastName})`,
    referrerEmail: referralRequests.referrerEmail,
    collectorName: referralRequests.collectorName,
    collectorEmail: referralRequests.collectorEmail,
    collectorFocus: referralRequests.collectorFocus,
    isMerchant: referralRequests.isMerchant,
    message: referralRequests.message,
    status: referralRequests.status,
    adminNotes: referralRequests.adminNotes,
    createdAt: referralRequests.createdAt,
    reviewedAt: referralRequests.reviewedAt,
    reviewedBy: referralRequests.reviewedBy
  }).from(referralRequests).orderBy(desc(referralRequests.createdAt));
  return requests;
}
async function updateReferralRequestStatus(id, status, adminNotes, reviewedBy) {
  const db = await requireDb();
  await db.update(referralRequests).set({
    status,
    adminNotes,
    reviewedBy,
    reviewedAt: mysqlNow()
  }).where(eq(referralRequests.id, id));
}
async function getUnsentReferrals() {
  const db = await requireDb();
  const requests = await db.select().from(referralRequests).where(and(eq(referralRequests.emailSent, 0), eq(referralRequests.hasJoined, 0))).orderBy(asc(referralRequests.createdAt));
  return requests;
}
async function markReferralsAsEmailed(ids) {
  const db = await requireDb();
  if (ids.length === 0) return;
  await db.update(referralRequests).set({
    emailSent: 1,
    emailSentAt: mysqlNow()
  }).where(inArray(referralRequests.id, ids));
}
async function markReferralAsJoined(id, userId) {
  const db = await requireDb();
  await db.update(referralRequests).set({
    hasJoined: 1,
    joinedAt: mysqlNow(),
    joinedUserId: userId
  }).where(eq(referralRequests.id, id));
}
async function removeReferral(id) {
  const db = await requireDb();
  await db.delete(referralRequests).where(eq(referralRequests.id, id));
}
async function getReferralsByIds(ids) {
  const db = await requireDb();
  if (ids.length === 0) return [];
  const requests = await db.select({
    id: referralRequests.id,
    collectorName: referralRequests.collectorName,
    collectorEmail: referralRequests.collectorEmail,
    collectorFocus: referralRequests.collectorFocus,
    message: referralRequests.message,
    emailSent: referralRequests.emailSent,
    hasJoined: referralRequests.hasJoined
  }).from(referralRequests).where(inArray(referralRequests.id, ids));
  return requests;
}
async function getTopHighestValueItems(viewerId = null) {
  const db = await requireDb();
  const listingRows = await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    status: listings.status,
    featured: listings.featured,
    isActive: listings.isActive,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
    primaryPhotoUrl: listingPhotos.imageUrl
  }).from(listings).leftJoin(listingPhotos, and(
    eq(listings.id, listingPhotos.listingId),
    eq(listingPhotos.sortOrder, 0)
  )).where(eq(listings.status, "active")).orderBy(desc(listings.estimatedValue)).limit(10);
  return formatListings(listingRows, viewerId);
}
async function trackListingView(listingId) {
  const db = await requireDb();
  await db.update(listings).set({
    viewCount: sql`${listings.viewCount} + 1`
  }).where(eq(listings.id, listingId));
}
async function addToFavorites(userId, listingId) {
  const db = await requireDb();
  try {
    await db.insert(favorites).values({
      userId,
      listingId
    });
    return true;
  } catch (error) {
    return false;
  }
}
async function removeFromFavorites(userId, listingId) {
  const db = await requireDb();
  const result = await db.delete(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))
  );
  return Array.isArray(result) && result.length > 0;
}
async function isFavorited(userId, listingId) {
  const db = await requireDb();
  const result = await db.select().from(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))
  ).limit(1);
  return result.length > 0;
}
async function getTopMostFavoritedItems(viewerId) {
  const db = await requireDb();
  const listingRows = await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    itemDetails: listings.itemDetails,
    status: listings.status,
    isActive: listings.isActive,
    featured: listings.featured,
    viewCount: listings.viewCount,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
    primaryPhotoUrl: listingPhotos.imageUrl,
    favoriteCount: sql`COUNT(${favorites.id})`.as("favoriteCount")
  }).from(listings).leftJoin(listingPhotos, and(
    eq(listings.id, listingPhotos.listingId),
    eq(listingPhotos.sortOrder, 0)
  )).leftJoin(favorites, eq(listings.id, favorites.listingId)).where(eq(listings.status, "active")).groupBy(
    listings.id,
    listings.ownerId,
    listings.title,
    listings.category,
    listings.condition,
    listings.grade,
    listings.certificationCompany,
    listings.estimatedValue,
    listings.description,
    listings.itemDetails,
    listings.status,
    listings.isActive,
    listings.featured,
    listings.viewCount,
    listings.createdAt,
    listings.updatedAt,
    listingPhotos.imageUrl
  ).having(sql`COUNT(${favorites.id}) > 0`).orderBy(desc(sql`COUNT(${favorites.id})`)).limit(10);
  return formatListings(listingRows, viewerId ?? null);
}
async function getTopMostViewedItems(viewerId) {
  const db = await requireDb();
  const listingRows = await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    itemDetails: listings.itemDetails,
    status: listings.status,
    isActive: listings.isActive,
    featured: listings.featured,
    viewCount: listings.viewCount,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
    primaryPhotoUrl: listingPhotos.imageUrl,
    favoriteCount: sql`COUNT(${favorites.id})`.as("favoriteCount")
  }).from(listings).leftJoin(listingPhotos, and(
    eq(listings.id, listingPhotos.listingId),
    eq(listingPhotos.sortOrder, 0)
  )).leftJoin(favorites, eq(listings.id, favorites.listingId)).where(eq(listings.status, "active")).groupBy(
    listings.id,
    listings.ownerId,
    listings.title,
    listings.category,
    listings.condition,
    listings.grade,
    listings.certificationCompany,
    listings.estimatedValue,
    listings.description,
    listings.itemDetails,
    listings.status,
    listings.isActive,
    listings.featured,
    listings.viewCount,
    listings.createdAt,
    listings.updatedAt,
    listingPhotos.imageUrl
  ).orderBy(desc(listings.viewCount)).limit(10);
  return formatListings(listingRows, viewerId ?? null);
}
async function adminDeleteListing(admin, input) {
  const db = await requireDb();
  const adminUser = await db.select().from(users).where(eq(users.id, admin.id)).limit(1);
  if (!adminUser[0] || adminUser[0].role !== "admin") {
    throw new Error("Only admins can delete listings.");
  }
  const listing = await db.select({ id: listings.id, ownerId: listings.ownerId, title: listings.title }).from(listings).where(eq(listings.id, input.listingId)).limit(1);
  if (!listing[0]) {
    throw new Error("Listing not found.");
  }
  await db.transaction(async (tx) => {
    await tx.delete(tradeProposalItems).where(eq(tradeProposalItems.offeredListingId, input.listingId));
    await tx.delete(tradeProposals).where(eq(tradeProposals.requestedListingId, input.listingId));
    await tx.delete(watchlistEntries).where(eq(watchlistEntries.listingId, input.listingId));
    const inquiryIds = await tx.select({ id: itemInquiries.id }).from(itemInquiries).where(eq(itemInquiries.listingId, input.listingId));
    if (inquiryIds.length > 0) {
      const ids = inquiryIds.map((i) => i.id);
      await tx.delete(inquiryReplies).where(inArray(inquiryReplies.inquiryId, ids));
    }
    await tx.delete(itemInquiries).where(eq(itemInquiries.listingId, input.listingId));
    await tx.delete(favorites).where(eq(favorites.listingId, input.listingId));
    await tx.delete(listingPhotos).where(eq(listingPhotos.listingId, input.listingId));
    await tx.delete(listings).where(eq(listings.id, input.listingId));
  });
  return {
    success: true,
    deletedListingId: input.listingId,
    listingTitle: listing[0].title,
    ownerId: listing[0].ownerId
  };
}
async function adminBulkDeleteListings(admin, input) {
  const db = await requireDb();
  const adminUser = await db.select().from(users).where(eq(users.id, admin.id)).limit(1);
  if (!adminUser[0] || adminUser[0].role !== "admin") {
    throw new Error("Only admins can delete listings.");
  }
  if (input.listingIds.length === 0) {
    throw new Error("No listings selected for deletion.");
  }
  const listings_to_delete = await db.select({ id: listings.id, title: listings.title, ownerId: listings.ownerId }).from(listings).where(inArray(listings.id, input.listingIds));
  if (listings_to_delete.length === 0) {
    throw new Error("No listings found.");
  }
  await db.transaction(async (tx) => {
    await tx.delete(tradeProposalItems).where(inArray(tradeProposalItems.offeredListingId, input.listingIds));
    await tx.delete(tradeProposals).where(inArray(tradeProposals.requestedListingId, input.listingIds));
    await tx.delete(watchlistEntries).where(inArray(watchlistEntries.listingId, input.listingIds));
    const inquiryIds = await tx.select({ id: itemInquiries.id }).from(itemInquiries).where(inArray(itemInquiries.listingId, input.listingIds));
    if (inquiryIds.length > 0) {
      const ids = inquiryIds.map((i) => i.id);
      await tx.delete(inquiryReplies).where(inArray(inquiryReplies.inquiryId, ids));
    }
    await tx.delete(itemInquiries).where(inArray(itemInquiries.listingId, input.listingIds));
    await tx.delete(favorites).where(inArray(favorites.listingId, input.listingIds));
    await tx.delete(listingPhotos).where(inArray(listingPhotos.listingId, input.listingIds));
    await tx.delete(listings).where(inArray(listings.id, input.listingIds));
  });
  return {
    success: true,
    deletedCount: listings_to_delete.length,
    deletedListings: listings_to_delete
  };
}
async function deleteDraftsOlderThan(db, cutoffDate) {
  const { draftListings: draftListings2, listingPhotos: listingPhotos2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { lt } = await import("drizzle-orm");
  const oldDrafts = await db.select({ id: draftListings2.id }).from(draftListings2).where(lt(draftListings2.createdAt, toMysqlDateTime(cutoffDate)));
  if (oldDrafts.length === 0) {
    return 0;
  }
  const draftIds = oldDrafts.map((d) => d.id);
  await db.delete(listingPhotos2).where(inArray(listingPhotos2.listingId, draftIds));
  await db.delete(draftListings2).where(inArray(draftListings2.id, draftIds));
  return draftIds.length;
}
async function createForumPost(user, input) {
  const db = await requireDb();
  const { forumPosts: forumPosts2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const result = await db.insert(forumPosts2).values({
    userId: user.id,
    category: input.category,
    title: input.title.trim().slice(0, 255),
    content: input.content.trim()
  });
  return { postId: getInsertId(result) };
}
async function getForumPosts(category, sortBy = "newest") {
  const db = await requireDb();
  const { forumPosts: forumPosts2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4, desc: desc5 } = await import("drizzle-orm");
  const baseQuery = db.select({
    id: forumPosts2.id,
    userId: forumPosts2.userId,
    category: forumPosts2.category,
    title: forumPosts2.title,
    content: forumPosts2.content,
    isPinned: forumPosts2.isPinned,
    isLocked: forumPosts2.isLocked,
    isSolved: forumPosts2.isSolved,
    viewCount: forumPosts2.viewCount,
    replyCount: forumPosts2.replyCount,
    createdAt: forumPosts2.createdAt,
    updatedAt: forumPosts2.updatedAt,
    author: {
      id: users2.id,
      name: users2.displayName,
      avatarUrl: users2.avatarUrl
    }
  }).from(forumPosts2).leftJoin(users2, eq4(forumPosts2.userId, users2.id));
  if (category) {
    if (sortBy === "newest") {
      return baseQuery.where(eq4(forumPosts2.category, category)).orderBy(desc5(forumPosts2.isPinned), desc5(forumPosts2.createdAt));
    } else if (sortBy === "popular") {
      return baseQuery.where(eq4(forumPosts2.category, category)).orderBy(desc5(forumPosts2.isPinned), desc5(forumPosts2.viewCount));
    } else {
      return baseQuery.where(eq4(forumPosts2.category, category)).orderBy(desc5(forumPosts2.isPinned), desc5(forumPosts2.replyCount));
    }
  } else {
    if (sortBy === "newest") {
      return baseQuery.orderBy(desc5(forumPosts2.isPinned), desc5(forumPosts2.createdAt));
    } else if (sortBy === "popular") {
      return baseQuery.orderBy(desc5(forumPosts2.isPinned), desc5(forumPosts2.viewCount));
    } else {
      return baseQuery.orderBy(desc5(forumPosts2.isPinned), desc5(forumPosts2.replyCount));
    }
  }
}
async function getForumPostById(postId) {
  const db = await requireDb();
  const { forumPosts: forumPosts2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4, sql: sql5 } = await import("drizzle-orm");
  await db.update(forumPosts2).set({ viewCount: sql5`viewCount + 1` }).where(eq4(forumPosts2.id, postId));
  const result = await db.select({
    id: forumPosts2.id,
    userId: forumPosts2.userId,
    category: forumPosts2.category,
    title: forumPosts2.title,
    content: forumPosts2.content,
    isPinned: forumPosts2.isPinned,
    isLocked: forumPosts2.isLocked,
    isSolved: forumPosts2.isSolved,
    viewCount: forumPosts2.viewCount,
    replyCount: forumPosts2.replyCount,
    createdAt: forumPosts2.createdAt,
    updatedAt: forumPosts2.updatedAt,
    author: {
      id: users2.id,
      name: users2.displayName,
      avatarUrl: users2.avatarUrl
    }
  }).from(forumPosts2).leftJoin(users2, eq4(forumPosts2.userId, users2.id)).where(eq4(forumPosts2.id, postId)).limit(1);
  return result[0] || null;
}
async function addForumReply(user, input) {
  const db = await requireDb();
  const { forumReplies: forumReplies2, forumPosts: forumPosts2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4 } = await import("drizzle-orm");
  const result = await db.insert(forumReplies2).values({
    postId: input.postId,
    userId: user.id,
    content: input.content.trim()
  });
  const { sql: sql5 } = await import("drizzle-orm");
  await db.update(forumPosts2).set({ replyCount: sql5`replyCount + 1` }).where(eq4(forumPosts2.id, input.postId));
  return { replyId: getInsertId(result) };
}
async function getForumReplies(postId) {
  const db = await requireDb();
  const { forumReplies: forumReplies2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4 } = await import("drizzle-orm");
  return db.select({
    id: forumReplies2.id,
    postId: forumReplies2.postId,
    userId: forumReplies2.userId,
    content: forumReplies2.content,
    createdAt: forumReplies2.createdAt,
    updatedAt: forumReplies2.updatedAt,
    author: {
      id: users2.id,
      name: users2.displayName,
      avatarUrl: users2.avatarUrl
    }
  }).from(forumReplies2).leftJoin(users2, eq4(forumReplies2.userId, users2.id)).where(eq4(forumReplies2.postId, postId)).orderBy(asc(forumReplies2.createdAt));
}
async function getConventions(filters) {
  const db = await requireDb();
  const { conventions: conventions2, conventionCategories: conventionCategories2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4, and: and3, gte: gte3, asc: asc3, inArray: inArray4, sql: sql5 } = await import("drizzle-orm");
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const baseClauses = [
    eq4(conventions2.status, "approved"),
    gte3(conventions2.startDate, today)
  ];
  if (filters.country) baseClauses.push(eq4(conventions2.country, filters.country));
  if (filters.state) baseClauses.push(eq4(conventions2.state, filters.state));
  let conventionIds = null;
  if (filters.category && filters.category !== "all") {
    const catRows = await db.select({ conventionId: conventionCategories2.conventionId }).from(conventionCategories2).where(eq4(conventionCategories2.category, filters.category));
    conventionIds = catRows.map((r) => r.conventionId);
    if (conventionIds.length === 0) return [];
    baseClauses.push(inArray4(conventions2.id, conventionIds));
  }
  const rows = await db.select({
    id: conventions2.id,
    name: conventions2.name,
    category: conventions2.category,
    startDate: conventions2.startDate,
    endDate: conventions2.endDate,
    city: conventions2.city,
    state: conventions2.state,
    country: conventions2.country,
    venue: conventions2.venue,
    website: conventions2.website,
    admission: conventions2.admission,
    description: conventions2.description,
    source: conventions2.source,
    createdAt: conventions2.createdAt
  }).from(conventions2).where(and3(...baseClauses)).orderBy(asc3(conventions2.startDate)).limit(500);
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const catRows = await db.select({ conventionId: conventionCategories2.conventionId, category: conventionCategories2.category }).from(conventionCategories2).where(inArray4(conventionCategories2.conventionId, ids));
    const catMap = /* @__PURE__ */ new Map();
    for (const cr of catRows) {
      if (!catMap.has(cr.conventionId)) catMap.set(cr.conventionId, []);
      catMap.get(cr.conventionId).push(cr.category);
    }
    return rows.map((r) => ({ ...r, categories: catMap.get(r.id) || [r.category] }));
  }
  return rows.map((r) => ({ ...r, categories: [r.category] }));
}
async function getUpcomingConventions(limit = 3, userLocation) {
  const db = await requireDb();
  const { conventions: conventions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4, gte: gte3, asc: asc3, and: and3 } = await import("drizzle-orm");
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const baseWhere = and3(eq4(conventions2.status, "approved"), gte3(conventions2.startDate, today));
  if (userLocation?.state) {
    const stateMatches = await db.select({
      id: conventions2.id,
      name: conventions2.name,
      category: conventions2.category,
      startDate: conventions2.startDate,
      endDate: conventions2.endDate,
      city: conventions2.city,
      state: conventions2.state,
      country: conventions2.country
    }).from(conventions2).where(and3(baseWhere, eq4(conventions2.state, userLocation.state))).orderBy(asc3(conventions2.startDate)).limit(limit);
    if (stateMatches.length >= limit) return stateMatches;
    const stateIds = stateMatches.map((r) => r.id);
    const { notInArray } = await import("drizzle-orm");
    const countryMatches = await db.select({
      id: conventions2.id,
      name: conventions2.name,
      category: conventions2.category,
      startDate: conventions2.startDate,
      endDate: conventions2.endDate,
      city: conventions2.city,
      state: conventions2.state,
      country: conventions2.country
    }).from(conventions2).where(and3(
      baseWhere,
      eq4(conventions2.country, userLocation.country || "United States"),
      stateIds.length > 0 ? notInArray(conventions2.id, stateIds) : void 0
    )).orderBy(asc3(conventions2.startDate)).limit(limit - stateMatches.length);
    return [...stateMatches, ...countryMatches].slice(0, limit);
  }
  if (userLocation?.country) {
    return db.select({
      id: conventions2.id,
      name: conventions2.name,
      category: conventions2.category,
      startDate: conventions2.startDate,
      endDate: conventions2.endDate,
      city: conventions2.city,
      state: conventions2.state,
      country: conventions2.country
    }).from(conventions2).where(and3(baseWhere, eq4(conventions2.country, userLocation.country))).orderBy(asc3(conventions2.startDate)).limit(limit);
  }
  return [];
}
async function submitConvention(data) {
  const db = await requireDb();
  const { conventions: conventions2, conventionCategories: conventionCategories2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const result = await db.insert(conventions2).values({
    name: data.name,
    category: data.category,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    country: data.country,
    venue: data.venue ?? null,
    website: data.website ?? null,
    admission: data.admission ?? null,
    description: data.description ?? null,
    source: "user",
    status: "pending",
    submittedBy: data.submittedBy ?? null
  });
  const newId = Number(result[0].insertId);
  const categoriesToInsert = data.categories && data.categories.length > 0 ? data.categories : [data.category];
  for (const cat of categoriesToInsert) {
    try {
      await db.insert(conventionCategories2).values({ conventionId: newId, category: cat });
    } catch {
    }
  }
  return { id: newId };
}
async function getPendingConventions() {
  const db = await requireDb();
  const { conventions: conventions2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4, desc: desc5 } = await import("drizzle-orm");
  return db.select({
    id: conventions2.id,
    name: conventions2.name,
    category: conventions2.category,
    startDate: conventions2.startDate,
    endDate: conventions2.endDate,
    city: conventions2.city,
    state: conventions2.state,
    country: conventions2.country,
    venue: conventions2.venue,
    website: conventions2.website,
    admission: conventions2.admission,
    description: conventions2.description,
    source: conventions2.source,
    status: conventions2.status,
    createdAt: conventions2.createdAt,
    submittedByName: users2.displayName
  }).from(conventions2).leftJoin(users2, eq4(conventions2.submittedBy, users2.id)).where(eq4(conventions2.status, "pending")).orderBy(desc5(conventions2.createdAt));
}
async function approveConvention(id, adminId) {
  const db = await requireDb();
  const { conventions: conventions2, conventionCategories: conventionCategories2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4 } = await import("drizzle-orm");
  await db.update(conventions2).set({ status: "approved", approvedBy: adminId }).where(eq4(conventions2.id, id));
  const [conv] = await db.select({ category: conventions2.category }).from(conventions2).where(eq4(conventions2.id, id));
  if (conv) {
    try {
      await db.insert(conventionCategories2).values({ conventionId: id, category: conv.category });
    } catch {
    }
  }
  return { success: true };
}
async function rejectConvention(id, adminId) {
  const db = await requireDb();
  const { conventions: conventions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4 } = await import("drizzle-orm");
  await db.update(conventions2).set({ status: "rejected", approvedBy: adminId }).where(eq4(conventions2.id, id));
  return { success: true };
}
async function deleteConvention(id) {
  const db = await requireDb();
  const { conventions: conventions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4 } = await import("drizzle-orm");
  await db.delete(conventions2).where(eq4(conventions2.id, id));
  return { success: true };
}
async function suspendUser(userId) {
  const db = await requireDb();
  await db.update(users).set({
    isSuspended: 1,
    suspendedAt: mysqlNow()
  }).where(eq(users.id, userId));
  return { success: true };
}
async function unsuspendUser(userId) {
  const db = await requireDb();
  await db.update(users).set({
    isSuspended: 0,
    suspendedAt: null
  }).where(eq(users.id, userId));
  return { success: true };
}
async function getSuspendedUsers() {
  const db = await requireDb();
  const suspendedUsers = await db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    email: users.email,
    suspendedAt: users.suspendedAt,
    role: users.role
  }).from(users).where(eq(users.isSuspended, 1)).orderBy(desc(users.suspendedAt));
  return suspendedUsers;
}
var collectibleCategories, itemConditions, _db, categoryLabels, conditionLabels;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    init_storage();
    collectibleCategories = ["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins"];
    itemConditions = ["mint", "near_mint", "excellent", "very_good", "good", "fair", "poor"];
    _db = null;
    categoryLabels = {
      comics: "Comics",
      sports_cards: "Sports Cards",
      vintage_toys: "Vintage Toys",
      video_games: "Video Games",
      stamps: "Stamps",
      coins: "Coins",
      pokemon: "Pokemon",
      movies: "Movies",
      autographs: "Autographs",
      disney_pins: "Disney Pins"
    };
    conditionLabels = {
      mint: "Mint",
      near_mint: "Near Mint",
      excellent: "Excellent",
      very_good: "Very Good",
      good: "Good",
      fair: "Fair",
      poor: "Poor"
    };
  }
});

// server/_core/customAuth.ts
var customAuth_exports = {};
__export(customAuth_exports, {
  CustomAuthService: () => CustomAuthService,
  customAuth: () => customAuth
});
import { SignJWT as SignJWT2, jwtVerify as jwtVerify2 } from "jose";
var ONE_YEAR_MS2, CustomAuthService, customAuth;
var init_customAuth = __esm({
  "server/_core/customAuth.ts"() {
    "use strict";
    init_env();
    init_db();
    init_const();
    ONE_YEAR_MS2 = 365 * 24 * 60 * 60 * 1e3;
    CustomAuthService = class {
      getSessionSecret() {
        const secret = ENV.jwtSecret;
        if (!secret) {
          throw new Error("JWT_SECRET environment variable is not set");
        }
        return new TextEncoder().encode(secret);
      }
      /**
       * Create a session token for a custom auth user
       */
      async createSessionToken(userId, username, role, options = {}) {
        const issuedAt = Date.now();
        const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS2;
        const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
        const secretKey = this.getSessionSecret();
        return new SignJWT2({
          userId,
          username,
          role
        }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
      }
      /**
       * Verify and decode a session token
       */
      async verifySession(token) {
        if (!token) return null;
        try {
          const secretKey = this.getSessionSecret();
          const verified = await jwtVerify2(token, secretKey);
          return verified.payload;
        } catch (error) {
          return null;
        }
      }
      /**
       * Extract session cookie from request headers
       */
      parseCookies(cookieHeader) {
        const cookies = /* @__PURE__ */ new Map();
        if (!cookieHeader) return cookies;
        cookieHeader.split(";").forEach((cookie) => {
          const [key, value] = cookie.split("=");
          if (key && value) {
            cookies.set(key.trim(), decodeURIComponent(value.trim()));
          }
        });
        return cookies;
      }
      /**
       * Get user from session cookie
       */
      async getUserFromSession(sessionCookie) {
        if (!sessionCookie) return null;
        const session = await this.verifySession(sessionCookie);
        if (!session) return null;
        try {
          const user = await getUserById(session.userId);
          return user || null;
        } catch (error) {
          console.error("[CustomAuth] Failed to get user from session:", error);
          return null;
        }
      }
      /**
       * Create session cookie header value
       */
      createSessionCookie(token, expiresInMs = ONE_YEAR_MS2) {
        const expiresAt = new Date(Date.now() + expiresInMs);
        return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Expires=${expiresAt.toUTCString()}`;
      }
    };
    customAuth = new CustomAuthService();
  }
});

// server/conventionScraper.ts
var conventionScraper_exports = {};
__export(conventionScraper_exports, {
  runConventionScraper: () => runConventionScraper
});
import { JSDOM } from "jsdom";
function expandState(abbr) {
  if (!abbr) return null;
  return US_STATE_ABBR[abbr.trim().toUpperCase()] || abbr.trim();
}
function parseDate(text2) {
  const m = text2.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–]\s*(?:[A-Za-z]+\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?)?,?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (!month) return null;
  const year = m[4];
  const startDate = `${year}-${month}-${m[2].padStart(2, "0")}`;
  const endDate = m[3] ? `${year}-${month}-${m[3].padStart(2, "0")}` : null;
  if (startDate < TODAY()) return null;
  return { startDate, endDate };
}
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "curl/7.88.1", "Accept": "*/*" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}
async function scrapeCardShowHub() {
  const events = [];
  const monthMap = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12"
  };
  for (let page = 1; page <= 3; page++) {
    try {
      const url = page === 1 ? "https://cardshowhub.com/events" : `https://cardshowhub.com/events?page=${page}`;
      const html = await fetchHtml(url);
      const doc = new JSDOM(html).window.document;
      const cards = doc.querySelectorAll("a[href^='/events/']");
      let found = 0;
      for (const card of Array.from(cards)) {
        const h3 = card.querySelector("h3");
        if (!h3) continue;
        const name = h3.textContent?.trim();
        if (!name) continue;
        const allText = [];
        Array.from(card.querySelectorAll("*")).forEach((el) => {
          el.childNodes.forEach((n) => {
            if (n.nodeType === 3 && n.textContent?.trim()) allText.push(n.textContent.trim());
          });
        });
        const dateText = allText.find((t2) => /^[A-Z][a-z]{2}\s+\d/.test(t2));
        if (!dateText) continue;
        const dm = dateText.match(/^([A-Z][a-z]{2})\s+(\d{1,2})(?:[–\-](\d{1,2}))?/);
        if (!dm) continue;
        const month = monthMap[dm[1]];
        if (!month) continue;
        const now = /* @__PURE__ */ new Date();
        let year = YEAR;
        if (parseInt(month) < now.getMonth() + 1) year = NEXT_YEAR;
        const startDate = `${year}-${month}-${dm[2].padStart(2, "0")}`;
        if (startDate < TODAY()) continue;
        const endDate = dm[3] ? `${year}-${month}-${dm[3].padStart(2, "0")}` : null;
        const locText = allText.find((t2) => /^[A-Za-z\s]+,\s+[A-Za-z\s]+$/.test(t2) && !t2.includes("Entry"));
        let city = null, state = null;
        if (locText) {
          const parts = locText.split(",").map((p) => p.trim());
          city = parts[0];
          state = parts[1];
        }
        const admText = allText.find((t2) => /free entry|^\$\d|free$/i.test(t2));
        const admission = admText ? admText.toLowerCase().includes("free") ? "Free" : admText.match(/\$[\d.]+/)?.[0] || null : null;
        events.push({
          name,
          category: "sports_cards",
          startDate,
          endDate,
          city,
          state,
          country: "United States",
          venue: null,
          website: `https://cardshowhub.com${card.getAttribute("href")}`,
          admission,
          description: null
        });
        found++;
      }
      if (found < 10) break;
      await new Promise((r) => setTimeout(r, 1e3));
    } catch (e) {
      break;
    }
  }
  return events;
}
async function scrapeToyConsPage(url, category) {
  const events = [];
  try {
    const html = await fetchHtml(url);
    const doc = new JSDOM(html).window.document;
    const text2 = doc.body.textContent || "";
    const lines = text2.split("\n").map((l) => l.trim()).filter((l) => l.length > 2);
    for (let i = 0; i < lines.length; i++) {
      const dateResult = parseDate(lines[i]);
      if (!dateResult) continue;
      const prevLine = lines[i - 1] || "";
      if (/^(Cancelled|Postponed|Rescheduled)$/i.test(prevLine)) continue;
      let name = "";
      for (let back = 1; back <= 3; back++) {
        const prev = lines[i - back] || "";
        if (/^(Cancelled|Postponed|Rescheduled|TBD|Date|Location|Convention|Name)$/i.test(prev)) continue;
        if (prev.length > 3 && !/^\d/.test(prev) && !/^[A-Z]{2}$/.test(prev) && !parseDate(prev)) {
          name = prev;
          break;
        }
      }
      if (!name || name.length < 3) continue;
      const venueLine = lines[i + 1] || "";
      if (!venueLine || parseDate(venueLine)) continue;
      const locMatch = venueLine.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})$/);
      if (!locMatch) continue;
      const city = locMatch[1].trim();
      const state = expandState(locMatch[2]);
      const venueOnly = venueLine.substring(0, venueLine.lastIndexOf(locMatch[0])).trim() || null;
      const cleanName = name.replace(/\s*\(?\d{4}\)?$/, "").trim();
      if (!cleanName || cleanName.length < 3) continue;
      events.push({
        name: cleanName,
        category,
        ...dateResult,
        city,
        state,
        country: "United States",
        venue: venueOnly && venueOnly.length > 2 ? venueOnly : null,
        website: url,
        admission: null,
        description: null
      });
    }
  } catch {
  }
  return events;
}
async function scrapePopverse() {
  const events = [];
  const US_STATES = new Set(Object.values(US_STATE_ABBR));
  try {
    const html = await fetchHtml("https://www.thepopverse.com/comics-conventions-cons-con-near-me-nycc-san-diego-anime-tickets");
    const doc = new JSDOM(html).window.document;
    const text2 = doc.body.textContent || "";
    const lines = text2.split("\n").map((l) => l.trim()).filter((l) => l.length > 2);
    for (let i = 0; i < lines.length - 2; i++) {
      const dateResult = parseDate(lines[i]);
      if (!dateResult) continue;
      const name = lines[i + 1];
      if (!name || name.length < 3 || /^[A-Z][a-z]+ \d/.test(name) || /^\d{4}/.test(name)) continue;
      const locationText = lines[i + 2];
      if (!locationText || /^[A-Z][a-z]+ \d/.test(locationText)) continue;
      const parts = locationText.split(",").map((p) => p.trim());
      const city = parts[0];
      const state = parts[parts.length - 1];
      if (state && !US_STATES.has(state)) continue;
      events.push({
        name: name.trim(),
        category: "comics",
        ...dateResult,
        city,
        state,
        country: "United States",
        venue: null,
        website: "https://www.thepopverse.com/comics-conventions-cons-con-near-me-nycc-san-diego-anime-tickets",
        admission: null,
        description: null
      });
      i += 2;
    }
  } catch {
  }
  return events;
}
async function scrapeNumismaticNews() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.numismaticnews.net/events/show-calendar");
    const doc = new JSDOM(html).window.document;
    const text2 = doc.body.textContent || "";
    const lines = text2.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);
    for (const line of lines) {
      const m = line.match(/^([A-Z][a-z]{2})\s+(\d{1,2})(?:-(\d{1,2}))?\s+([A-Z]{2}),\s+([^.]+)\.\s+([^.]+)/);
      if (!m) continue;
      const month = MONTH_MAP[m[1].toLowerCase()];
      if (!month) continue;
      const now = /* @__PURE__ */ new Date();
      let year = YEAR;
      if (parseInt(month) < now.getMonth() + 1) year = NEXT_YEAR;
      const startDate = `${year}-${month}-${m[2].padStart(2, "0")}`;
      if (startDate < TODAY()) continue;
      const endDate = m[3] ? `${year}-${month}-${m[3].padStart(2, "0")}` : null;
      const state = US_STATE_ABBR[m[4]] || m[4];
      const city = m[5].trim();
      const name = m[6].trim();
      if (!name || name.length < 3) continue;
      const admMatch = line.match(/\bA:\s*([^.]+?)(?:\.|T:|F:|SP:|SH:|$)/);
      const admission = admMatch ? admMatch[1].trim() : null;
      events.push({
        name,
        category: "coins",
        startDate,
        endDate,
        city,
        state,
        country: "United States",
        venue: null,
        website: "https://www.numismaticnews.net/events/show-calendar",
        admission: admission === "Free" ? "Free" : admission,
        description: null
      });
    }
  } catch {
  }
  return events;
}
async function scrapeAmericanStampDealer() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.americanstampdealer.com/Show_Calendar.aspx");
    const doc = new JSDOM(html).window.document;
    const rows = Array.from(doc.querySelectorAll("table tr"));
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));
      if (cells.length < 2) continue;
      const dateText = cells[0]?.textContent?.trim() || "";
      const dateResult = parseDate(dateText);
      if (!dateResult) continue;
      const name = cells[1]?.textContent?.trim();
      if (!name || name.length < 3) continue;
      const locText = cells[2]?.textContent?.trim() || cells[3]?.textContent?.trim() || "";
      const locMatch = locText.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      events.push({
        name,
        category: "stamps",
        ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States",
        venue: null,
        website: "https://www.americanstampdealer.com/Show_Calendar.aspx",
        admission: null,
        description: null
      });
    }
  } catch {
  }
  return events;
}
async function scrapeWFSCStamps() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.wfscstamps.org/Shows/");
    const doc = new JSDOM(html).window.document;
    const text2 = doc.body.textContent || "";
    const lines = text2.split("\n").map((l) => l.trim()).filter((l) => l.length > 5);
    for (const line of lines) {
      const dateResult = parseDate(line);
      if (!dateResult) continue;
      const dashIdx = line.indexOf(" - ", line.search(/\d{4}/));
      const name = dashIdx > 0 ? line.substring(dashIdx + 3).trim() : "";
      if (!name || name.length < 3) continue;
      const locMatch = line.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      events.push({
        name,
        category: "stamps",
        ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States",
        venue: null,
        website: "https://www.wfscstamps.org/Shows/",
        admission: null,
        description: null
      });
    }
  } catch {
  }
  return events;
}
async function scrapeHallOfFameSignings() {
  const events = [];
  try {
    const html = await fetchHtml("https://halloffamesignings.com/");
    const doc = new JSDOM(html).window.document;
    const text2 = doc.body.textContent || "";
    const lines = text2.split("\n").map((l) => l.trim()).filter((l) => l.length > 5);
    for (let i = 0; i < lines.length; i++) {
      const dateResult = parseDate(lines[i]);
      if (!dateResult) continue;
      const name = lines[i - 1] || "";
      if (!name || name.length < 3 || name === "Hall of Fame Signings") continue;
      const locMatch = lines[i + 1]?.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/) || lines[i].match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      events.push({
        name: name.trim(),
        category: "autographs",
        ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States",
        venue: null,
        website: "https://halloffamesignings.com",
        admission: null,
        description: null
      });
    }
  } catch {
  }
  return events;
}
async function scrapeCreationEnt() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.creationent.com/calendar.htm");
    const doc = new JSDOM(html).window.document;
    const paras = Array.from(doc.querySelectorAll("p"));
    for (const p of paras) {
      const strong = p.querySelector("strong");
      const dateLink = p.querySelector("a.small1, a");
      if (!strong || !dateLink) continue;
      const locationText = strong.textContent?.trim() || "";
      const dateText = dateLink.textContent?.trim() || "";
      const dateResult = parseDate(dateText);
      if (!dateResult) continue;
      const locMatch = locationText.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      const name = `Creation Entertainment \u2014 ${locationText}`;
      events.push({
        name,
        category: "autographs",
        ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States",
        venue: null,
        website: "https://www.creationent.com/calendar.htm",
        admission: null,
        description: "Celebrity autograph convention"
      });
    }
  } catch {
  }
  return events;
}
async function scrapeD23() {
  const events = [];
  try {
    const html = await fetchHtml("https://d23.com/events");
    const doc = new JSDOM(html).window.document;
    const articles = Array.from(doc.querySelectorAll("article, .event-item"));
    for (const article of articles) {
      const name = article.querySelector("a, h2, h3")?.getAttribute("title") || article.querySelector("a, h2, h3")?.textContent?.trim() || "";
      if (!name || name.length < 3) continue;
      const dateText = article.querySelector(".d23-events-meta-text, time, .event-date")?.textContent?.trim() || article.textContent || "";
      const dateResult = parseDate(dateText);
      if (!dateResult) continue;
      const locMatch = dateText.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      events.push({
        name,
        category: "disney_pins",
        ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States",
        venue: null,
        website: "https://d23.com/events",
        admission: null,
        description: null
      });
    }
  } catch {
  }
  return events;
}
async function scrapeVideoGameCons2026() {
  const allEvents = await scrapeToyConsPage("https://videogamecons.com/calendar/calendar.php?year=2026", "video_games");
  return allEvents.map((e) => ({
    ...e,
    category: /pokemon|poke|tcg|trading card/i.test(e.name) ? "pokemon" : e.category
  }));
}
async function runConventionScraper() {
  const db = await requireDb();
  const existing = await db.select({ name: conventions.name, startDate: conventions.startDate }).from(conventions);
  const existingSet = new Set(existing.map((r) => `${r.name.substring(0, 50)}||${r.startDate}`));
  const allEvents = [];
  const scrapers = [
    // Sports Cards
    { name: "CardShowHub", fn: scrapeCardShowHub },
    // Vintage Toys
    { name: "ToysCons", fn: () => scrapeToyConsPage("https://toycons.com/calendar/calendar.php?year=2026&loc=us", "vintage_toys") },
    { name: "ToyConsFuture", fn: () => scrapeToyConsPage("https://toycons.com/calendar/", "vintage_toys") },
    // Video Games + Pokemon/TCG
    { name: "VideoGameCons", fn: () => scrapeToyConsPage("https://videogamecons.com/calendar/", "video_games") },
    { name: "VideoGameCons2026", fn: scrapeVideoGameCons2026 },
    // Comics
    { name: "Popverse", fn: scrapePopverse },
    // Coins
    { name: "NumismaticNews", fn: scrapeNumismaticNews },
    // Stamps
    { name: "AmericanStampDealer", fn: scrapeAmericanStampDealer },
    { name: "WFSCStamps", fn: scrapeWFSCStamps },
    // Autographs
    { name: "HallOfFameSignings", fn: scrapeHallOfFameSignings },
    { name: "CreationEnt", fn: scrapeCreationEnt },
    // Disney Pins
    { name: "D23", fn: scrapeD23 }
  ];
  for (const { name, fn } of scrapers) {
    try {
      const events = await fn();
      allEvents.push(...events);
      await new Promise((r) => setTimeout(r, 1e3));
    } catch (e) {
      console.error(`Scraper ${name} failed:`, e.message);
    }
  }
  const seen = /* @__PURE__ */ new Set();
  const deduped = allEvents.filter((e) => {
    if (!e.name || !e.startDate) return false;
    const key = `${e.name.substring(0, 50)}||${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  let inserted = 0, skipped = 0, errors = 0;
  const byCategory = {};
  for (const e of deduped) {
    const key = `${e.name.substring(0, 50)}||${e.startDate}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }
    try {
      await db.insert(conventions).values({
        name: e.name,
        category: e.category,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        city: e.city ?? null,
        state: e.state ?? null,
        country: e.country,
        venue: e.venue ?? null,
        website: e.website ?? null,
        admission: e.admission ?? null,
        description: e.description ?? null,
        source: "scraper",
        status: "approved"
      });
      inserted++;
      existingSet.add(key);
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    } catch (err) {
      errors++;
    }
  }
  return { inserted, skipped, errors, byCategory };
}
var TODAY, YEAR, NEXT_YEAR, MONTH_MAP, US_STATE_ABBR;
var init_conventionScraper = __esm({
  "server/conventionScraper.ts"() {
    "use strict";
    init_db();
    init_schema();
    TODAY = () => (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    YEAR = (/* @__PURE__ */ new Date()).getFullYear();
    NEXT_YEAR = YEAR + 1;
    MONTH_MAP = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12"
    };
    US_STATE_ABBR = {
      AL: "Alabama",
      AK: "Alaska",
      AZ: "Arizona",
      AR: "Arkansas",
      CA: "California",
      CO: "Colorado",
      CT: "Connecticut",
      DE: "Delaware",
      FL: "Florida",
      GA: "Georgia",
      HI: "Hawaii",
      ID: "Idaho",
      IL: "Illinois",
      IN: "Indiana",
      IA: "Iowa",
      KS: "Kansas",
      KY: "Kentucky",
      LA: "Louisiana",
      ME: "Maine",
      MD: "Maryland",
      MA: "Massachusetts",
      MI: "Michigan",
      MN: "Minnesota",
      MS: "Mississippi",
      MO: "Missouri",
      MT: "Montana",
      NE: "Nebraska",
      NV: "Nevada",
      NH: "New Hampshire",
      NJ: "New Jersey",
      NM: "New Mexico",
      NY: "New York",
      NC: "North Carolina",
      ND: "North Dakota",
      OH: "Ohio",
      OK: "Oklahoma",
      OR: "Oregon",
      PA: "Pennsylvania",
      RI: "Rhode Island",
      SC: "South Carolina",
      SD: "South Dakota",
      TN: "Tennessee",
      TX: "Texas",
      UT: "Utah",
      VT: "Vermont",
      VA: "Virginia",
      WA: "Washington",
      WV: "West Virginia",
      WI: "Wisconsin",
      WY: "Wyoming",
      DC: "Washington D.C."
    };
  }
});

// server/_core/index.ts
import dotenv from "dotenv";
import express2 from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/oauth.ts
init_const();
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/sdk.ts
init_const();

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId || sessionUserId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
init_env();
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      const imageResp = await fetch(url);
      if (!imageResp.ok) {
        console.error(`[StorageProxy] CloudFront error: ${imageResp.status}`);
        res.status(502).send("Failed to fetch image from storage");
        return;
      }
      const contentType = imageResp.headers.get("content-type");
      const contentLength = imageResp.headers.get("content-length");
      if (contentType) res.set("Content-Type", contentType);
      if (contentLength) res.set("Content-Length", contentLength);
      res.set("Cache-Control", "public, max-age=31536000");
      res.set("Vary", "Accept-Encoding");
      const buffer = await imageResp.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
init_const();
init_db();
import { z as z3 } from "zod";

// shared/gradingCompanyConfig.ts
var gradingCompanyConfigs = [
  // COMICS
  {
    name: "CGC Comics",
    categories: ["comics"],
    gradeScale: "0.5-10",
    validGrades: ["0.5", "0.7", "0.9", "1.0", "1.2", "1.4", "1.6", "1.8", "2.0", "2.2", "2.4", "2.6", "2.8", "3.0", "3.2", "3.4", "3.6", "3.8", "4.0", "4.2", "4.4", "4.6", "4.8", "5.0", "5.2", "5.4", "5.6", "5.8", "6.0", "6.2", "6.4", "6.6", "6.8", "7.0", "7.2", "7.4", "7.6", "7.8", "8.0", "8.2", "8.4", "8.6", "8.8", "9.0", "9.2", "9.4", "9.6", "9.8", "10.0"],
    increment: "0.2",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Pristine 10"]
  },
  {
    name: "CBCS",
    categories: ["comics"],
    gradeScale: "0.5-10",
    validGrades: ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "PGX Comics",
    categories: ["comics"],
    gradeScale: "0.5-10",
    validGrades: ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  // SPORTS CARDS & POKEMON
  {
    name: "PSA",
    categories: ["sports_cards", "pokemon", "autographs"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "10"],
    increment: "0.5 (no half grades for 9-10)",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "Beckett Grading Services (BGS)",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: true,
    hasSealGrade: false,
    specialDesignations: ["Pristine 10", "Gem Mint 9.5", "Black Label 10"]
  },
  {
    name: "SGC",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "CGC Cards",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Pristine 10", "Gem Mint 10"]
  },
  {
    name: "TAG Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "HGA",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: true,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "Arena Club Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "Degree Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-11",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11"],
    increment: "0.5",
    hasSubgrades: true,
    hasSealGrade: false,
    specialDesignations: ["Degree 11"]
  },
  {
    name: "ACE Grading",
    categories: ["pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: true,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "ISA Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "GMA Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "Rare Edition",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "FCG (Forensic Card Grading)",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "MNT Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Flawless 10", "Pristine 10"]
  },
  {
    name: "KSA Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "PGA Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "RCG",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "OnlyGraded",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "Diamond Service Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "CGA Card Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "TRCG",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "Pokegrade",
    categories: ["pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "Tree Frog Grading",
    categories: ["pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "AP Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "PRO",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "GEM",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "GAI",
    categories: ["sports_cards", "pokemon", "autographs"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "PCI",
    categories: ["sports_cards"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "WCG",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  // COINS
  {
    name: "PCGS",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Plus grades (45+, 50+, 53+, 55+, 58+, 62+, 63+, 64+, 65+, 66+, 67+, 68+)"]
  },
  {
    name: "NGC",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Plus designation", "Star designation"]
  },
  {
    name: "ANACS",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "ICG",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "SEGS",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "SGS",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  // PAPER MONEY
  {
    name: "PMG",
    categories: ["movies"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["EPQ (Exceptional Paper Quality)", "Star designation", "NET"]
  },
  {
    name: "PCGS Banknote",
    categories: ["movies"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "Legacy Currency Grading",
    categories: ["movies"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  // VIDEO GAMES
  {
    name: "WATA Games",
    categories: ["video_games"],
    gradeScale: "1-10 + seal grade",
    validGrades: ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: true,
    specialDesignations: ["Seal grades: A++, A+, A, B+, B, C"]
  },
  {
    name: "CGC Video Games",
    categories: ["video_games"],
    gradeScale: "1-10 + seal grade",
    validGrades: ["1.0", "1.2", "1.4", "1.6", "1.8", "2.0", "2.2", "2.4", "2.6", "2.8", "3.0", "3.2", "3.4", "3.6", "3.8", "4.0", "4.2", "4.4", "4.6", "4.8", "5.0", "5.2", "5.4", "5.6", "5.8", "6.0", "6.2", "6.4", "6.6", "6.8", "7.0", "7.2", "7.4", "7.6", "7.8", "8.0", "8.2", "8.4", "8.6", "8.8", "9.0", "9.2", "9.4", "9.6", "9.8", "9.9", "10.0"],
    increment: "0.2 (1-9), 0.1 (9-10)",
    hasSubgrades: false,
    hasSealGrade: true,
    specialDesignations: ["Seal grades: A++, A+, A, B+, B, C"]
  },
  {
    name: "VGA",
    categories: ["video_games"],
    gradeScale: "0-100 or 1-10",
    validGrades: ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "1 point (0-100) or 0.5 (1-10)",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Gold (85+)", "Silver (75-84)", "Bronze (below 75)"]
  },
  {
    name: "CGC Home Video",
    categories: ["video_games", "movies"],
    gradeScale: "1-10 + seal grade",
    validGrades: ["1.0", "1.2", "1.4", "1.6", "1.8", "2.0", "2.2", "2.4", "2.6", "2.8", "3.0", "3.2", "3.4", "3.6", "3.8", "4.0", "4.2", "4.4", "4.6", "4.8", "5.0", "5.2", "5.4", "5.6", "5.8", "6.0", "6.2", "6.4", "6.6", "6.8", "7.0", "7.2", "7.4", "7.6", "7.8", "8.0", "8.2", "8.4", "8.6", "8.8", "9.0", "9.2", "9.4", "9.6", "9.8", "9.9", "10.0"],
    increment: "0.2 (1-9), 0.1 (9-10)",
    hasSubgrades: false,
    hasSealGrade: true,
    specialDesignations: ["Seal grades: A++, A+, A, B+, B, C"]
  },
  {
    name: "VHS Grading",
    categories: ["video_games", "movies"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "IGS",
    categories: ["video_games", "movies"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  // STAMPS
  {
    name: "PSE",
    categories: ["stamps"],
    gradeScale: "1-100",
    validGrades: ["10", "20", "30", "40", "50", "60", "65", "70", "75", "80", "85", "90", "95", "98", "100"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Centering grades"]
  },
  {
    name: "ASG",
    categories: ["stamps"],
    gradeScale: "1-100",
    validGrades: ["10", "20", "30", "40", "50", "60", "75", "80", "85", "88", "90", "95", "99", "100"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "PSAG",
    categories: ["stamps"],
    gradeScale: "1-100",
    validGrades: ["10", "20", "30", "40", "50", "60", "75", "80", "85", "90", "95", "100"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  // VINTAGE TOYS
  {
    name: "AFA",
    categories: ["vintage_toys"],
    gradeScale: "0-100 or 1-10",
    validGrades: ["10", "20", "30", "40", "50", "60", "70", "75", "80", "85", "90", "95", "100", "1.0", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"],
    increment: "5 points (0-100) or 0.2 (1-10)",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Sealed", "Qualified", "Loose categories"]
  },
  {
    name: "CAS",
    categories: ["vintage_toys"],
    gradeScale: "1-100 or 1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "100"],
    increment: "1 point (1-100) or 0.1 (1-10)",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  {
    name: "UKG",
    categories: ["vintage_toys"],
    gradeScale: "1-100",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "100"],
    increment: "1 point",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  },
  // AUTOGRAPHS
  {
    name: "PSA/DNA",
    categories: ["autographs"],
    gradeScale: "Authentication + optional 1-10",
    validGrades: ["authenticated", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Authentication-focused"]
  },
  {
    name: "JSA",
    categories: ["autographs"],
    gradeScale: "Authentication only",
    validGrades: ["authenticated"],
    increment: "N/A",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Authentication-only service"]
  },
  {
    name: "Beckett Authentication Services",
    categories: ["autographs"],
    gradeScale: "Authentication + optional 1-10",
    validGrades: ["authenticated", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Authentication-focused"]
  },
  // RAW/UNGRADED (all categories)
  {
    name: "Raw",
    categories: ["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins"],
    gradeScale: "Ungraded",
    validGrades: ["raw", "ungraded"],
    increment: "N/A",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: []
  }
];
function getGradingCompanyByName(name) {
  return gradingCompanyConfigs.find((company) => company.name === name);
}
function isValidGradeForCompany(companyName, grade) {
  const company = getGradingCompanyByName(companyName);
  if (!company) return false;
  return company.validGrades.includes(grade);
}

// server/routers.ts
init_db();

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
init_const();
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/auth.ts
import bcrypt from "bcrypt";
function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    return false;
  }
}
function isValidUsername(username) {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(username);
}
function isValidPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// server/routers.ts
init_db();

// server/_core/ebay.ts
init_env();
var EBAY_API_BASE = "https://api.ebay.com";
var EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
var EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
function getEbayAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: ENV.ebayClientId,
    response_type: "code",
    redirect_uri: ENV.ebayRedirectUri,
    scope: "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.account.readonly",
    state
  });
  return `${EBAY_AUTH_URL}?${params.toString()}`;
}
async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: ENV.ebayRedirectUri
  });
  const response = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${ENV.ebayClientId}:${ENV.ebayClientSecret}`).toString("base64")}`
    },
    body: params.toString()
  });
  if (!response.ok) {
    throw new Error(`eBay token exchange failed: ${response.statusText}`);
  }
  return response.json();
}
async function getUserInfo(accessToken) {
  const response = await fetch(`${EBAY_API_BASE}/sell/account/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch eBay user info: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    username: data.username,
    userId: data.userId,
    feedbackScore: data.feedbackScore || 0,
    feedbackPercentage: data.positiveFeedbackPercent || 0,
    memberSince: new Date(data.memberSince)
  };
}
async function getUserFeedback(accessToken, ebayUserId) {
  const threeYearsAgo = /* @__PURE__ */ new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const params = new URLSearchParams({
    filter: `feedbackDateFrom:${threeYearsAgo.toISOString()}`,
    limit: "200"
    // Max feedback items to fetch
  });
  const response = await fetch(`${EBAY_API_BASE}/sell/feedback/v1/get_feedback_for_target?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    console.error(`Failed to fetch eBay feedback: ${response.statusText}`);
    return [];
  }
  const data = await response.json();
  const feedbackRecords = data.feedbackRecords || [];
  return feedbackRecords.map((record) => ({
    feedbackId: record.feedbackId,
    rating: record.rating?.toLowerCase(),
    comment: record.comment,
    from: record.from?.username || "Unknown",
    itemId: record.itemId,
    itemTitle: record.itemTitle,
    feedbackDate: new Date(record.feedbackDate)
  }));
}

// server/tradeFlowRouter.ts
import { z as z2 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError3 } from "@trpc/server";
import { eq as eq2, sql as sql2, inArray as inArray2, asc as asc2 } from "drizzle-orm";
var initiateTradeSchema = z2.object({
  listingId: z2.number().int().positive(),
  message: z2.string().optional()
});
var declineTradeSchema = z2.object({
  proposalId: z2.number().int().positive(),
  reason: z2.string().optional()
});
var sendProposalSchema = z2.object({
  proposalId: z2.number().int().positive(),
  offeredListingIds: z2.array(z2.number().int().positive()),
  cashFromProposer: z2.number().min(0).optional(),
  cashFromRecipient: z2.number().min(0).optional(),
  message: z2.string().optional()
});
var acceptProposalSchema = z2.object({
  proposalId: z2.number().int().positive()
});
var rejectProposalSchema = z2.object({
  proposalId: z2.number().int().positive(),
  reason: z2.string().optional()
});
var submitTrackingSchema = z2.object({
  proposalId: z2.number().int().positive(),
  trackingNumbers: z2.array(z2.object({
    listingId: z2.number().int().positive(),
    carrier: z2.enum(["USPS", "UPS", "FedEx", "DHL", "Other"]),
    carrierOther: z2.string().max(100).optional(),
    trackingNumber: z2.string().min(1).max(50)
  }))
});
var confirmReceiptSchema = z2.object({
  proposalId: z2.number().int().positive(),
  confirmationType: z2.enum(["received", "damaged"]).default("received")
});
var fileComplaintSchema = z2.object({
  proposalId: z2.number().int().positive(),
  description: z2.string().min(1),
  complaintType: z2.enum(["damaged", "missing", "notAsDescribed", "other"]),
  photoUrls: z2.array(z2.string()).max(5).optional()
});
var leaveReviewSchema = z2.object({
  proposalId: z2.number().int().positive(),
  tradeExperienceRating: z2.number().int().min(0).max(5),
  itemConditionRating: z2.number().int().min(0).max(5),
  communicationRating: z2.number().int().min(0).max(5),
  shippingSpeedRating: z2.number().int().min(0).max(5),
  review: z2.string().optional(),
  photoUrls: z2.array(z2.string()).max(5).optional()
});
var getTradeAlertsSchema = z2.object({
  folder: z2.enum(["proposal", "negotiating", "accepted", "shipped", "declined", "completed"]),
  limit: z2.number().int().min(1).max(50).default(20),
  offset: z2.number().int().min(0).default(0),
  search: z2.string().optional()
});
var middleManRequestSchema = z2.object({
  proposalId: z2.number().int().positive(),
  action: z2.enum(["request", "approve", "deselect"])
});
var generateVotingLinkSchema = z2.object({
  proposalId: z2.number().int().positive()
});
var castVoteSchema = z2.object({
  linkToken: z2.string().min(1),
  verdict: z2.enum(["steal", "fair", "pass"]),
  comment: z2.string().optional()
});
var savePrivateNoteSchema = z2.object({
  proposalId: z2.number().int().positive(),
  noteContent: z2.string()
});
var sendTradeMessageSchema = z2.object({
  proposalId: z2.number().int().positive(),
  message: z2.string().min(1)
});
async function generateTradeRefNumber() {
  const db = await requireDb();
  const [result] = await db.execute(
    sql2`SELECT MAX(CAST(SUBSTRING(tradeReferenceNumber, 4) AS UNSIGNED)) as maxNum FROM tradeProposals WHERE tradeReferenceNumber IS NOT NULL`
  );
  const maxNum = result?.[0]?.maxNum ?? 0;
  const nextNum = maxNum + 1;
  return `TR-${String(nextNum).padStart(6, "0")}`;
}
function getFolderStatusFilter(folder) {
  switch (folder) {
    case "proposal":
      return ["pending"];
    // Initial inquiry, no items yet
    case "negotiating":
      return ["negotiating"];
    // Active negotiation with items
    case "accepted":
      return ["accepted"];
    case "shipped":
      return ["shipped"];
    case "declined":
      return ["declined", "cancelled"];
    case "completed":
      return ["completed"];
    default:
      return ["pending"];
  }
}
var tradeFlowRouter = router({
  // ==========================================================================
  // STAGE 1: TRADE INITIATION
  // ==========================================================================
  initiateTradeProposal: protectedProcedure.input(initiateTradeSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [initiator] = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
    if (initiator?.isSuspended) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Trading is disabled for suspended accounts" });
    }
    const [listing] = await db.select().from(listings).where(eq2(listings.id, input.listingId)).limit(1);
    if (!listing) throw new TRPCError3({ code: "NOT_FOUND", message: "Listing not found" });
    if (!listing.isActive || listing.status !== "active") {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "This listing is no longer available for trading" });
    }
    if (listing.ownerId === userId) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "You cannot trade with yourself" });
    }
    const [recipient] = await db.select().from(users).where(eq2(users.id, listing.ownerId)).limit(1);
    if (recipient?.isSuspended) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "This user's account is currently suspended" });
    }
    const tradeRef = await generateTradeRefNumber();
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.insert(tradeProposals).values({
      requesterId: userId,
      recipientId: listing.ownerId,
      requestedListingId: input.listingId,
      note: input.message || null,
      status: "pending",
      createdAt: now,
      updatedAt: now
    });
    const [inserted] = await db.execute(sql2`SELECT LAST_INSERT_ID() as id`);
    const proposalId = inserted?.[0]?.id;
    await db.execute(
      sql2`UPDATE tradeProposals SET tradeReferenceNumber = ${tradeRef}, initiatorMessage = ${input.message || null}, lastActivityAt = ${now} WHERE id = ${proposalId}`
    );
    const alertMessage = JSON.stringify({
      text: `${ctx.user.name || initiator?.username || "A user"} is interested in your item`,
      itemName: listing.title,
      itemId: listing.id,
      tradeRef,
      initiatorMessage: input.message || null
    });
    await db.execute(
      sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${proposalId}, ${listing.ownerId}, 'initiated', ${alertMessage}, ${now})`
    );
    await db.execute(
      sql2`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${proposalId}, 'initiated', ${userId}, ${"Trade initiated"}, ${now})`
    );
    return { proposalId, tradeReferenceNumber: tradeRef };
  }),
  declineTradeProposal: protectedProcedure.input(declineTradeSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(
      sql2`UPDATE tradeProposals SET status = 'declined', declineReason = ${input.reason || null}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
    );
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    await db.execute(
      sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'declined', 'Trade has been declined', ${now})`
    );
    return { success: true };
  }),
  cancelTrade: protectedProcedure.input(z2.object({ proposalId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    if (!["pending", "negotiating"].includes(proposal.status)) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Can only cancel trades in pending or negotiating status" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(
      sql2`UPDATE tradeProposals SET status = 'cancelled', lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
    );
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    await db.execute(
      sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'cancelled', 'Trade has been cancelled', ${now})`
    );
    return { success: true };
  }),
  // ==========================================================================
  // STAGE 2: NEGOTIATION
  // ==========================================================================
  enterWarRoom: protectedProcedure.input(z2.object({ proposalId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    if (proposal.status === "pending") {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      await db.execute(
        sql2`UPDATE tradeProposals SET status = 'negotiating', negotiatingAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    }
    return { success: true };
  }),
  sendTradeProposal: protectedProcedure.input(sendProposalSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(
      sql2`DELETE FROM tradeProposalItems WHERE proposalId = ${input.proposalId} AND offeredListingId IN (SELECT id FROM listings WHERE ownerId = ${userId})`
    );
    for (const listingId of input.offeredListingIds) {
      await db.insert(tradeProposalItems).values({
        proposalId: input.proposalId,
        offeredListingId: listingId,
        createdAt: now
      });
    }
    if (input.cashFromProposer !== void 0 || input.cashFromRecipient !== void 0) {
      await db.execute(
        sql2`UPDATE tradeProposals SET status = 'negotiating', cashFromRequester = ${input.cashFromProposer || 0}, cashFromRecipient = ${input.cashFromRecipient || 0}, lastProposedBy = ${userId}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    } else {
      await db.execute(
        sql2`UPDATE tradeProposals SET status = 'negotiating', lastProposedBy = ${userId}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    }
    if (input.message) {
      await db.insert(tradeMessages).values({
        proposalId: input.proposalId,
        senderId: userId,
        message: input.message,
        createdAt: now
      });
    }
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    await db.execute(
      sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'counterProposal', 'A new proposal has been submitted', ${now})`
    );
    return { success: true };
  }),
  acceptTradeProposal: protectedProcedure.input(acceptProposalSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    if (!["negotiating"].includes(proposal.status)) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Trade must be in negotiating status to accept" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    const [existingAcceptance] = await db.execute(
      sql2`SELECT id FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND userId = ${otherUserId} AND confirmationType = 'accepted'`
    );
    const otherHasAccepted = (existingAcceptance?.length || 0) > 0;
    if (otherHasAccepted) {
      await db.execute(
        sql2`UPDATE tradeProposals SET status = 'accepted', acceptedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
      await db.execute(
        sql2`UPDATE listings SET status = 'traded' WHERE id IN (SELECT offeredListingId FROM tradeProposalItems WHERE proposalId = ${input.proposalId})`
      );
      await db.execute(
        sql2`UPDATE listings SET status = 'traded' WHERE id = ${proposal.requestedListingId}`
      );
      await db.execute(
        sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'accepted', 'Both parties have accepted! Trade is now locked. Time to ship.', ${now})`
      );
      await db.execute(
        sql2`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${input.proposalId}, 'accepted', ${userId}, 'Mutual acceptance — trade locked', ${now})`
      );
      await db.execute(
        sql2`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType = 'accepted'`
      );
      await db.execute(
        sql2`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Item is no longer available (traded in another proposal)', updatedAt = ${now} WHERE id != ${input.proposalId} AND requestedListingId = ${proposal.requestedListingId} AND status IN ('pending', 'negotiating')`
      );
      await db.execute(
        sql2`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'An item in this proposal is no longer available', updatedAt = ${now} WHERE id != ${input.proposalId} AND status IN ('pending', 'negotiating') AND id IN (SELECT proposalId FROM tradeProposalItems WHERE offeredListingId IN (SELECT offeredListingId FROM tradeProposalItems WHERE proposalId = ${input.proposalId}))`
      );
      return { success: true, mutualAcceptance: true };
    } else {
      await db.execute(
        sql2`INSERT INTO tradeReceiptConfirmation (proposalId, userId, confirmationType, confirmedAt) VALUES (${input.proposalId}, ${userId}, 'accepted', ${now})`
      );
      await db.execute(
        sql2`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
      await db.execute(
        sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'accepted', 'Your trade partner has accepted! You have 72 hours to confirm.', ${now})`
      );
      await db.execute(
        sql2`INSERT INTO tradeAdminLog (proposalId, eventType, actorUserId, details, createdAt) VALUES (${input.proposalId}, 'accepted', ${userId}, 'First acceptance — awaiting mutual confirmation', ${now})`
      );
      return { success: true, mutualAcceptance: false };
    }
  }),
  rejectTradeProposal: protectedProcedure.input(rejectProposalSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.insert(tradeMessages).values({
      proposalId: input.proposalId,
      senderId: userId,
      message: input.reason || "Proposal rejected",
      createdAt: now
    });
    await db.execute(sql2`UPDATE tradeMessages SET messageType = 'rejection' WHERE proposalId = ${input.proposalId} AND senderId = ${userId} ORDER BY id DESC LIMIT 1`);
    await db.execute(
      sql2`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
    );
    return { success: true };
  }),
  // ==========================================================================
  // STAGE 3: SHIPPING & VERIFICATION
  // ==========================================================================
  submitTrackingNumbers: protectedProcedure.input(submitTrackingSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    for (const tracking of input.trackingNumbers) {
      await db.execute(
        sql2`INSERT INTO tradeTrackingNumbers (proposalId, userId, listingId, carrier, carrierOther, trackingNumber, submittedAt) VALUES (${input.proposalId}, ${userId}, ${tracking.listingId}, ${tracking.carrier}, ${tracking.carrierOther || null}, ${tracking.trackingNumber}, ${now})`
      );
    }
    const [trackingCounts] = await db.execute(
      sql2`SELECT COUNT(DISTINCT userId) as userCount FROM tradeTrackingNumbers WHERE proposalId = ${input.proposalId}`
    );
    const bothShipped = trackingCounts?.[0]?.userCount >= 2;
    if (bothShipped) {
      await db.execute(
        sql2`UPDATE tradeProposals SET status = 'shipped', shippedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    } else {
      await db.execute(
        sql2`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    }
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    await db.execute(
      sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'shipped', 'Tracking number submitted', ${now})`
    );
    return { success: true };
  }),
  confirmItemsReceived: protectedProcedure.input(confirmReceiptSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(
      sql2`INSERT INTO tradeReceiptConfirmation (proposalId, userId, confirmationType, confirmedAt) VALUES (${input.proposalId}, ${userId}, ${input.confirmationType}, ${now})`
    );
    const [confirmCounts] = await db.execute(
      sql2`SELECT COUNT(DISTINCT userId) as userCount FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType IN ('received', 'damaged')`
    );
    const bothConfirmed = confirmCounts?.[0]?.userCount >= 2;
    if (bothConfirmed) {
      await db.execute(
        sql2`UPDATE tradeProposals SET status = 'completed', completedAt = ${now}, lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    }
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    await db.execute(
      sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'received', 'Items have been confirmed received', ${now})`
    );
    return { success: true };
  }),
  fileComplaint: protectedProcedure.input(fileComplaintSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(
      sql2`INSERT INTO tradeComplaints (proposalId, complaintUserId, description, complaintType, photos, createdAt) VALUES (${input.proposalId}, ${userId}, ${input.description}, ${input.complaintType}, ${JSON.stringify(input.photoUrls || [])}, ${now})`
    );
    await db.execute(
      sql2`UPDATE tradeProposals SET status = 'disputed', lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
    );
    return { success: true };
  }),
  // ==========================================================================
  // STAGE 4: FEEDBACK & RATINGS
  // ==========================================================================
  leaveTradeReview: protectedProcedure.input(leaveReviewSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    const revieweeId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    const overallRating = ((input.tradeExperienceRating + input.itemConditionRating + input.communicationRating + input.shippingSpeedRating) / 4).toFixed(1);
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.insert(tradeReviews).values({
      proposalId: input.proposalId,
      reviewerId: userId,
      revieweeId,
      rating: Math.round(parseFloat(overallRating)),
      review: input.review || null,
      createdAt: now
    });
    await db.execute(
      sql2`UPDATE tradeReviews SET tradeExperienceRating = ${input.tradeExperienceRating}, itemConditionRating = ${input.itemConditionRating}, communicationRating = ${input.communicationRating}, shippingSpeedRating = ${input.shippingSpeedRating}, overallRating = ${overallRating}, isVisible = 0 WHERE proposalId = ${input.proposalId} AND reviewerId = ${userId}`
    );
    const [reviewCounts] = await db.execute(
      sql2`SELECT COUNT(*) as cnt FROM tradeReviews WHERE proposalId = ${input.proposalId}`
    );
    if (reviewCounts?.[0]?.cnt >= 2) {
      await db.execute(
        sql2`UPDATE tradeReviews SET isVisible = 1 WHERE proposalId = ${input.proposalId}`
      );
    }
    return { success: true };
  }),
  // ==========================================================================
  // QUERIES: TRADE HUB & WAR ROOM DATA
  // ==========================================================================
  getTradeAlerts: protectedProcedure.input(getTradeAlertsSchema).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const statuses = getFolderStatusFilter(input.folder);
    const statusPlaceholders = statuses.map((s) => `'${s}'`).join(",");
    const trades = await db.execute(
      sql2`SELECT 
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
          AND tp.status IN (${sql2.raw(statusPlaceholders)})
        ORDER BY tp.lastActivityAt DESC, tp.createdAt DESC
        LIMIT ${input.limit} OFFSET ${input.offset}`
    );
    const tradeList = trades?.[0] || [];
    const otherUserIds = Array.from(new Set(tradeList.map((t2) => t2.otherUserId))).filter(Boolean);
    let userMap = {};
    if (otherUserIds.length > 0) {
      const userIds = otherUserIds.map((id) => `${id}`).join(",");
      const [usersResult] = await db.execute(
        sql2`SELECT u.id, u.username, u.name, up.displayName, up.avatarUrl,
            (SELECT AVG(rating) FROM tradeReviews WHERE revieweeId = u.id) as avgRating,
            (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = u.id) as reviewCount
          FROM users u
          LEFT JOIN userProfiles up ON up.userId = u.id
          WHERE u.id IN (${sql2.raw(userIds)})`
      );
      for (const user of usersResult) {
        userMap[user.id] = user;
      }
    }
    const proposalIds = tradeList.map((t2) => t2.id);
    let itemCountMap = {};
    if (proposalIds.length > 0) {
      const pIds = proposalIds.join(",");
      const [itemCounts] = await db.execute(
        sql2`SELECT proposalId, COUNT(*) as itemCount FROM tradeProposalItems WHERE proposalId IN (${sql2.raw(pIds)}) GROUP BY proposalId`
      );
      for (const ic of itemCounts) {
        itemCountMap[ic.proposalId] = ic.itemCount;
      }
    }
    return {
      trades: tradeList.map((t2) => ({
        id: t2.id,
        tradeReferenceNumber: t2.tradeReferenceNumber,
        status: t2.status,
        direction: t2.direction,
        lastActivityAt: t2.lastActivityAt,
        createdAt: t2.createdAt,
        unreadCount: t2.unreadCount || 0,
        cashFromRequester: t2.cashFromRequester,
        cashFromRecipient: t2.cashFromRecipient,
        note: t2.note,
        listing: {
          id: t2.requestedListingId,
          title: t2.listingTitle,
          value: t2.listingValue,
          category: t2.listingCategory,
          image: t2.listingImage
        },
        otherUser: userMap[t2.otherUserId] || null,
        itemCount: itemCountMap[t2.id] || 0
      })),
      total: tradeList.length
    };
  }),
  getUnreadTradeAlertCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [result] = await db.execute(
      sql2`SELECT COUNT(*) as count FROM tradeAlerts WHERE recipientUserId = ${userId} AND isRead = 0`
    );
    return { count: result?.[0]?.count || 0 };
  }),
  getTradeDetails: protectedProcedure.input(z2.object({ proposalId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const [requestedListing] = await db.select().from(listings).where(eq2(listings.id, proposal.requestedListingId)).limit(1);
    const requestedPhotos = await db.select().from(listingPhotos).where(eq2(listingPhotos.listingId, proposal.requestedListingId)).orderBy(asc2(listingPhotos.sortOrder));
    const proposalItems = await db.select().from(tradeProposalItems).where(eq2(tradeProposalItems.proposalId, input.proposalId));
    const offeredListingIds = proposalItems.map((pi) => pi.offeredListingId);
    let offeredListings = [];
    if (offeredListingIds.length > 0) {
      offeredListings = await db.select().from(listings).where(inArray2(listings.id, offeredListingIds));
      for (const listing of offeredListings) {
        const photos = await db.select().from(listingPhotos).where(eq2(listingPhotos.listingId, listing.id)).orderBy(asc2(listingPhotos.sortOrder));
        listing.photos = photos;
      }
    }
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    const [otherUserResult] = await db.execute(
      sql2`SELECT u.id, u.username, u.name, up.displayName, up.avatarUrl, up.bio,
          (SELECT AVG(rating) FROM tradeReviews WHERE revieweeId = u.id) as avgRating,
          (SELECT COUNT(*) FROM tradeReviews WHERE revieweeId = u.id) as reviewCount
        FROM users u
        LEFT JOIN userProfiles up ON up.userId = u.id
        WHERE u.id = ${otherUserId}`
    );
    const [tradeExtra] = await db.execute(
      sql2`SELECT tradeReferenceNumber, negotiatingAt, acceptedAt, shippedAt, lastActivityAt, cashFromRequester, cashFromRecipient, middleManRequested, middleManApproved, declineReason, lastProposedBy FROM tradeProposals WHERE id = ${input.proposalId}`
    );
    return {
      proposal: {
        ...proposal,
        ...tradeExtra?.[0]
      },
      requestedListing: {
        ...requestedListing,
        photos: requestedPhotos
      },
      offeredListings: offeredListings.map((l) => ({
        ...l,
        ownerId: l.ownerId
      })),
      otherUser: otherUserResult?.[0] || null,
      isRequester: proposal.requesterId === userId
    };
  }),
  getOtherUserInventory: protectedProcedure.input(z2.object({
    proposalId: z2.number().int().positive(),
    category: z2.string().optional(),
    search: z2.string().optional()
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    let query = sql2`SELECT l.id, l.ownerId, l.title, l.category, l.itemType, l.estimatedValue,
        l.condition, l.grade, l.certificationCompany, l.certificationNumber,
        l.description, l.itemDetails, l.signatures, l.status, l.isActive, l.createdAt,
        (SELECT imageUrl FROM listingPhotos WHERE listingId = l.id ORDER BY sortOrder ASC LIMIT 1) as primaryImage
      FROM listings l
      WHERE l.ownerId = ${otherUserId} AND l.isActive = 1 AND l.status = 'active'`;
    if (input.category) {
      query = sql2`${query} AND l.category = ${input.category}`;
    }
    if (input.search) {
      query = sql2`${query} AND l.title LIKE ${`%${input.search}%`}`;
    }
    query = sql2`${query} ORDER BY l.createdAt DESC LIMIT 50`;
    const [items] = await db.execute(query);
    const itemList = items;
    const itemIds = itemList.map((i) => i.id);
    let allPhotos = [];
    if (itemIds.length > 0) {
      const [photoRows] = await db.execute(
        sql2`SELECT listingId, imageUrl, sortOrder FROM listingPhotos WHERE listingId IN (${sql2.raw(itemIds.join(","))}) ORDER BY sortOrder ASC`
      );
      allPhotos = photoRows;
    }
    const itemsWithPhotos = itemList.map((item) => ({
      ...item,
      photos: allPhotos.filter((p) => p.listingId === item.id).map((p) => ({ imageUrl: p.imageUrl, sortOrder: p.sortOrder }))
    }));
    return { items: itemsWithPhotos };
  }),
  getShippingInfo: protectedProcedure.input(z2.object({ proposalId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const [tracking] = await db.execute(
      sql2`SELECT * FROM tradeTrackingNumbers WHERE proposalId = ${input.proposalId}`
    );
    const [receipts] = await db.execute(
      sql2`SELECT * FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId}`
    );
    return {
      trackingNumbers: tracking,
      receipts
    };
  }),
  // ==========================================================================
  // COMMUNICATION
  // ==========================================================================
  sendMessage: protectedProcedure.input(sendTradeMessageSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.insert(tradeMessages).values({
      proposalId: input.proposalId,
      senderId: userId,
      message: input.message,
      createdAt: now
    });
    await db.execute(
      sql2`UPDATE tradeProposals SET lastActivityAt = ${now}, updatedAt = ${now} WHERE id = ${input.proposalId}`
    );
    const otherUserId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    await db.execute(
      sql2`INSERT INTO tradeAlerts (proposalId, recipientUserId, alertType, message, isRead, createdAt) VALUES (${input.proposalId}, ${otherUserId}, 'initiated', 'New message in trade', 0, ${now})`
    );
    return { success: true };
  }),
  getMessages: protectedProcedure.input(z2.object({
    proposalId: z2.number().int().positive(),
    limit: z2.number().int().min(1).max(100).default(50),
    offset: z2.number().int().min(0).default(0)
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, input.proposalId)).limit(1);
    if (!proposal) throw new TRPCError3({ code: "NOT_FOUND", message: "Trade not found" });
    if (proposal.recipientId !== userId && proposal.requesterId !== userId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Not authorized" });
    }
    const [messages] = await db.execute(
      sql2`SELECT tm.id, tm.senderId, tm.message, tm.messageType, tm.metadata, tm.createdAt,
          u.username as senderUsername, up.displayName as senderDisplayName, up.avatarUrl as senderAvatar
        FROM tradeMessages tm
        LEFT JOIN users u ON u.id = tm.senderId
        LEFT JOIN userProfiles up ON up.userId = tm.senderId
        WHERE tm.proposalId = ${input.proposalId}
        ORDER BY tm.createdAt ASC
        LIMIT ${input.limit} OFFSET ${input.offset}`
    );
    return { messages };
  }),
  // ==========================================================================
  // PRO FEATURES
  // ==========================================================================
  middleManService: protectedProcedure.input(middleManRequestSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    if (input.action === "request") {
      await db.execute(
        sql2`UPDATE tradeProposals SET middleManRequested = 1, middleManRequestedBy = ${userId}, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    } else if (input.action === "approve") {
      await db.execute(
        sql2`UPDATE tradeProposals SET middleManApproved = 1, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    } else if (input.action === "deselect") {
      await db.execute(
        sql2`UPDATE tradeProposals SET middleManRequested = 0, middleManApproved = 0, middleManRequestedBy = NULL, updatedAt = ${now} WHERE id = ${input.proposalId}`
      );
    }
    return { success: true };
  }),
  generateVotingLink: protectedProcedure.input(generateVotingLinkSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const token = Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("");
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(
      sql2`INSERT INTO tradeVotingLinks (proposalId, generatedByUserId, linkToken, expiresAt, createdAt) VALUES (${input.proposalId}, ${userId}, ${token}, ${expiresAt}, ${now})`
    );
    return { token, expiresAt };
  }),
  castVote: protectedProcedure.input(castVoteSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const [links] = await db.execute(
      sql2`SELECT id, proposalId, expiresAt FROM tradeVotingLinks WHERE linkToken = ${input.linkToken}`
    );
    const link = links?.[0];
    if (!link) throw new TRPCError3({ code: "NOT_FOUND", message: "Voting link not found" });
    if (new Date(link.expiresAt) < /* @__PURE__ */ new Date()) throw new TRPCError3({ code: "BAD_REQUEST", message: "Voting link has expired" });
    const [proposal] = await db.select().from(tradeProposals).where(eq2(tradeProposals.id, link.proposalId)).limit(1);
    if (proposal && (proposal.requesterId === userId || proposal.recipientId === userId)) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Cannot vote on your own trade" });
    }
    await db.execute(
      sql2`INSERT INTO tradeVotes (votingLinkId, voterUserId, verdict, comment, createdAt) VALUES (${link.id}, ${userId}, ${input.verdict}, ${input.comment || null}, ${now})`
    );
    return { success: true };
  }),
  getVotingResults: protectedProcedure.input(z2.object({ linkToken: z2.string().min(1) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const [links] = await db.execute(
      sql2`SELECT id, proposalId FROM tradeVotingLinks WHERE linkToken = ${input.linkToken}`
    );
    const link = links?.[0];
    if (!link) throw new TRPCError3({ code: "NOT_FOUND", message: "Voting link not found" });
    const [proposals] = await db.execute(
      sql2`SELECT tp.requestedListingId, tp.cashFromRequester, tp.cashFromRecipient,
          l.title as requestedTitle, l.estimatedValue as requestedValue, l.category as requestedCategory
        FROM tradeProposals tp
        LEFT JOIN listings l ON l.id = tp.requestedListingId
        WHERE tp.id = ${link.proposalId}`
    );
    const proposalData = proposals?.[0];
    const [offeredItems] = await db.execute(
      sql2`SELECT l.title, l.estimatedValue, l.category
        FROM tradeProposalItems tpi
        JOIN listings l ON l.id = tpi.offeredListingId
        WHERE tpi.proposalId = ${link.proposalId}`
    );
    const [votes] = await db.execute(
      sql2`SELECT verdict, comment, createdAt FROM tradeVotes WHERE votingLinkId = ${link.id} ORDER BY createdAt DESC`
    );
    const voteList = votes;
    const total = voteList.length;
    const steal = voteList.filter((v) => v.verdict === "steal").length;
    const fair = voteList.filter((v) => v.verdict === "fair").length;
    const pass = voteList.filter((v) => v.verdict === "pass").length;
    return {
      total,
      steal: { count: steal, percentage: total > 0 ? Math.round(steal / total * 100) : 0 },
      fair: { count: fair, percentage: total > 0 ? Math.round(fair / total * 100) : 0 },
      pass: { count: pass, percentage: total > 0 ? Math.round(pass / total * 100) : 0 },
      comments: voteList.filter((v) => v.comment).map((v) => ({ verdict: v.verdict, comment: v.comment, createdAt: v.createdAt })),
      // Anonymous trade details (no usernames)
      tradeDetails: {
        traderA: {
          items: offeredItems.map((i) => ({ title: i.title, value: i.estimatedValue, category: i.category })),
          cash: proposalData?.cashFromRequester || 0
        },
        traderB: {
          items: proposalData ? [{ title: proposalData.requestedTitle, value: proposalData.requestedValue, category: proposalData.requestedCategory }] : [],
          cash: proposalData?.cashFromRecipient || 0
        }
      }
    };
  }),
  savePrivateNote: protectedProcedure.input(savePrivateNoteSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(
      sql2`INSERT INTO tradePrivateNotes (proposalId, userId, noteContent, createdAt, updatedAt) VALUES (${input.proposalId}, ${userId}, ${input.noteContent}, ${now}, ${now}) ON DUPLICATE KEY UPDATE noteContent = ${input.noteContent}, updatedAt = ${now}`
    );
    return { success: true };
  }),
  getPrivateNote: protectedProcedure.input(z2.object({ proposalId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const [notes] = await db.execute(
      sql2`SELECT noteContent, updatedAt FROM tradePrivateNotes WHERE proposalId = ${input.proposalId} AND userId = ${userId}`
    );
    const note = notes?.[0];
    return { noteContent: note?.noteContent || "", updatedAt: note?.updatedAt || null };
  }),
  markAlertsAsRead: protectedProcedure.input(z2.object({ proposalId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    await db.execute(
      sql2`UPDATE tradeAlerts SET isRead = 1 WHERE proposalId = ${input.proposalId} AND recipientUserId = ${userId}`
    );
    return { success: true };
  })
});

// server/routers.ts
init_customAuth();
init_schema();
init_const();
import { eq as eq3, sql as sql3, desc as desc3, or as or3, inArray as inArray3 } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
var uploadedImageSchema = z3.object({
  name: z3.string().max(200).optional().default(""),
  type: z3.string().max(120).optional().default(""),
  contentBase64: z3.string().min(1).optional(),
  // Optional: only present for new uploads
  imageUrl: z3.string().optional(),
  // Optional: present for existing photos
  previewUrl: z3.string().optional()
  // Optional: frontend preview URL
});
var listingFiltersSchema = z3.object({
  category: z3.enum(collectibleCategories).optional(),
  condition: z3.enum(itemConditions).optional(),
  keyword: z3.string().max(100).optional(),
  issueNumber: z3.string().max(50).optional(),
  manufacturer: z3.string().max(100).optional(),
  year: z3.string().max(50).optional(),
  team: z3.string().max(100).optional(),
  series: z3.string().max(100).optional(),
  sport: z3.string().max(50).optional(),
  gradingService: z3.string().max(100).optional(),
  grade: z3.string().max(10).optional(),
  valueMin: z3.number().optional(),
  valueMax: z3.number().optional(),
  rookie: z3.string().max(10).optional(),
  autographed: z3.string().max(10).optional(),
  signed: z3.string().max(10).optional(),
  facsimile: z3.string().max(10).optional(),
  // Dedicated per-filter parameters (each filter owns its own channel)
  title: z3.string().max(160).optional(),
  system: z3.string().max(60).optional(),
  region: z3.string().max(60).optional(),
  country: z3.string().max(100).optional(),
  format: z3.string().max(60).optional(),
  medium: z3.string().max(60).optional(),
  denomination: z3.string().max(60).optional(),
  mintMark: z3.string().max(20).optional(),
  issuer: z3.string().max(100).optional(),
  edition: z3.string().max(60).optional(),
  parkOrEvent: z3.string().max(100).optional(),
  franchise: z3.string().max(100).optional(),
  rarity: z3.string().max(60).optional()
});
var memberSearchSchema = z3.object({
  query: z3.string().max(120).optional(),
  region: z3.string().max(120).optional(),
  verification: z3.enum(["all", "verified", "established", "rising"]).optional()
});
var reportUserSchema = z3.object({
  reportedMember: z3.string().min(2).max(160),
  listingReference: z3.string().max(240).optional(),
  concernType: z3.enum([
    "Counterfeit or inaccurate item description",
    "Harassment or abusive conduct",
    "Spam, solicitation, or scam activity",
    "Unsafe trade behavior",
    "Unauthorized contact information sharing",
    "Other community concern"
  ]),
  contactEmail: z3.string().email().max(320),
  details: z3.string().min(20).max(3e3),
  supportingNotes: z3.string().max(2e3).optional()
});
var referralRequestSchema = z3.object({
  friendName: z3.string().min(2).max(160),
  friendEmail: z3.string().email().max(320),
  collectorFocus: z3.string().min(2).max(200),
  isMerchant: z3.boolean().default(false),
  message: z3.string().min(20).max(2e3)
});
var appRouter = router({
  system: systemRouter,
  tradeFlow: tradeFlowRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) {
        return null;
      }
      const db = await requireDb();
      const profile = await db.select({
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        avatarUrl: userProfiles.avatarUrl
      }).from(userProfiles).where(eq3(userProfiles.userId, user.id)).limit(1);
      return {
        ...user,
        firstName: profile[0]?.firstName ?? null,
        lastName: profile[0]?.lastName ?? null,
        avatarUrl: profile[0]?.avatarUrl ?? null
      };
    }),
    signup: publicProcedure.input(
      z3.object({
        username: z3.string().min(3).max(32),
        password: z3.string().min(8),
        displayName: z3.string().min(1).max(255),
        email: z3.string().email().optional()
      })
    ).mutation(async ({ input, ctx }) => {
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
        email: input.email
      });
      const sessionToken = await customAuth.createSessionToken(
        userId,
        input.username,
        "user",
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true, userId };
    }),
    signin: publicProcedure.input(
      z3.object({
        username: z3.string(),
        password: z3.string()
      })
    ).mutation(async ({ input, ctx }) => {
      const user = await getUserByUsername(input.username);
      if (!user || !user.passwordHash) {
        throw new Error("Invalid username or password");
      }
      const passwordMatch = await verifyPassword(input.password, user.passwordHash);
      if (!passwordMatch) {
        throw new Error("Invalid username or password");
      }
      const { customAuth: customAuth2 } = await Promise.resolve().then(() => (init_customAuth(), customAuth_exports));
      const sessionToken = await customAuth2.createSessionToken(
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
      if (ctx.user?.id) {
        const offlineTime = toMysqlDateTime(/* @__PURE__ */ new Date("1970-01-02T00:00:00Z"));
        await db.update(users).set({ lastActivityAt: offlineTime }).where(eq3(users.id, ctx.user.id));
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    unreadCounts: protectedProcedure.query(async ({ ctx }) => {
      const unreadNotificationsResult = await getUnreadNotificationCount(ctx.user.id);
      const unreadMessagesResult = await getUnreadMessageCount(ctx.user.id);
      return {
        unreadNotifications: unreadNotificationsResult?.count ?? 0,
        unreadMessages: unreadMessagesResult?.count ?? 0
      };
    })
  }),
  members: router({
    search: publicProcedure.input(memberSearchSchema.optional()).query(({ input }) => {
      return searchMembers(input ?? {});
    })
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
    getUserProfile: publicProcedure.input(z3.object({ userId: z3.number().int().positive() })).query(async ({ input, ctx }) => {
      const db = await requireDb();
      const user = await db.select().from(users).where(eq3(users.id, input.userId)).limit(1);
      if (!user.length) {
        throw new TRPCError4({ code: "NOT_FOUND", message: "User not found" });
      }
      const profile = await db.select().from(userProfiles).where(eq3(userProfiles.userId, input.userId)).limit(1);
      const userListings = await db.select().from(listings).where(eq3(listings.ownerId, input.userId)).limit(100);
      return {
        user: user[0],
        profile: profile[0] || null,
        listings: userListings
      };
    }),
    search: publicProcedure.input(
      z3.object({
        query: z3.string().max(100),
        category: z3.enum(collectibleCategories).optional(),
        condition: z3.enum(itemConditions).optional()
      })
    ).query(({ ctx, input }) => {
      return getMarketplaceFeed(
        {
          keyword: input.query,
          category: input.category,
          condition: input.condition
        },
        ctx.user?.id ?? null
      );
    }),
    dashboard: protectedProcedure.query(({ ctx }) => {
      return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
    }),
    listingDetail: publicProcedure.input(
      z3.object({
        listingId: z3.number().int().positive()
      })
    ).query(async ({ ctx, input }) => {
      const detail = await getListingDetail(input.listingId, ctx.user?.id ?? null);
      return { listing: detail };
    }),
    saveProfile: protectedProcedure.input(
      z3.object({
        // DEPRECATED: retained for client compatibility but IGNORED server-side.
        // The authenticated session (ctx.user.id) is the only trusted identity.
        // Previously this public procedure trusted a client-supplied userId,
        // letting anonymous visitors overwrite any user's profile.
        userId: z3.union([z3.string(), z3.number()]).optional(),
        displayName: z3.string().min(2).max(120),
        bio: z3.string().max(500).optional(),
        contactFullName: z3.string().max(160).optional(),
        contactEmail: z3.string().email().max(320).optional().or(z3.literal("")),
        contactPhone: z3.string().max(40).optional(),
        contactAddress: z3.string().max(320).optional(),
        contactTown: z3.string().max(100).optional(),
        contactState: z3.string().max(100).optional(),
        contactZipCode: z3.string().max(20).optional(),
        contactCountry: z3.string().max(100).optional(),
        firstName: z3.string().max(100).optional(),
        lastName: z3.string().max(100).optional(),
        avatar: uploadedImageSchema.nullable().optional(),
        acceptedTerms: z3.boolean().optional(),
        isMerchant: z3.boolean().optional(),
        securityQuestion: z3.string().max(255).optional(),
        securityAnswer: z3.string().max(255).optional(),
        preferredCategories: z3.array(z3.enum(collectibleCategories)).optional(),
        notificationPreferences: z3.object({
          tradeRequests: z3.boolean().optional(),
          messages: z3.boolean().optional(),
          feedback: z3.boolean().optional(),
          systemUpdates: z3.boolean().optional()
        }).optional(),
        emailVerified: z3.boolean().optional(),
        phoneVerified: z3.boolean().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const isAdmin = ctx.user.role === "admin";
      const db0 = await requireDb();
      const existingProfile = await db0.select({ acceptedTerms: userProfiles.acceptedTerms }).from(userProfiles).where(eq3(userProfiles.userId, userId)).limit(1);
      const isFirstTimeSetup = !existingProfile[0] || !existingProfile[0].acceptedTerms;
      if (!isAdmin && !isFirstTimeSetup) {
        const identityFieldsAttempted = [];
        if (input.firstName !== void 0 && input.firstName) identityFieldsAttempted.push("firstName");
        if (input.lastName !== void 0 && input.lastName) identityFieldsAttempted.push("lastName");
        if (input.contactEmail !== void 0 && input.contactEmail) identityFieldsAttempted.push("contactEmail");
        if (input.contactAddress !== void 0 && input.contactAddress) identityFieldsAttempted.push("contactAddress");
        if (input.contactTown !== void 0 && input.contactTown) identityFieldsAttempted.push("contactTown");
        if (input.contactState !== void 0 && input.contactState) identityFieldsAttempted.push("contactState");
        if (input.contactZipCode !== void 0 && input.contactZipCode) identityFieldsAttempted.push("contactZipCode");
        if (input.contactCountry !== void 0 && input.contactCountry) identityFieldsAttempted.push("contactCountry");
        if (input.contactPhone !== void 0 && input.contactPhone) identityFieldsAttempted.push("contactPhone");
        if (input.contactFullName !== void 0 && input.contactFullName) identityFieldsAttempted.push("contactFullName");
        if (identityFieldsAttempted.length > 0) {
          console.warn(
            `[saveProfile] Non-admin user ${userId} attempted to modify identity fields:`,
            identityFieldsAttempted
          );
          throw new TRPCError4({
            code: "FORBIDDEN",
            message: "Identity fields cannot be modified. These fields were verified during account setup and can only be changed by administrators. Contact support if you need to update them."
          });
        }
      }
      const canWriteIdentity = isAdmin || isFirstTimeSetup;
      return updateProfile(
        { id: userId, name: input.displayName },
        {
          displayName: input.displayName,
          bio: input.bio,
          contactFullName: canWriteIdentity ? input.contactFullName : void 0,
          contactEmail: canWriteIdentity ? input.contactEmail : void 0,
          contactPhone: canWriteIdentity ? input.contactPhone : void 0,
          contactAddress: canWriteIdentity ? input.contactAddress : void 0,
          contactTown: canWriteIdentity ? input.contactTown : void 0,
          contactState: canWriteIdentity ? input.contactState : void 0,
          contactZipCode: canWriteIdentity ? input.contactZipCode : void 0,
          contactCountry: canWriteIdentity ? input.contactCountry : void 0,
          firstName: canWriteIdentity ? input.firstName : void 0,
          lastName: canWriteIdentity ? input.lastName : void 0,
          avatar: input.avatar ? { name: input.avatar.name, type: input.avatar.type, contentBase64: input.avatar.contentBase64 } : null,
          acceptedTerms: input.acceptedTerms,
          isMerchant: input.isMerchant,
          securityQuestion: input.securityQuestion,
          securityAnswer: input.securityAnswer,
          preferredCategories: input.preferredCategories,
          notificationPreferences: input.notificationPreferences,
          emailVerified: input.emailVerified,
          phoneVerified: input.phoneVerified
        }
      );
    }),
    saveSecurityQuestion: protectedProcedure.input(
      z3.object({
        securityQuestion: z3.string().max(255),
        securityAnswer: z3.string().max(255)
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(userProfiles).set({
        securityQuestion: input.securityQuestion,
        securityAnswer: input.securityAnswer
      }).where(eq3(userProfiles.userId, ctx.user.id));
      return { success: true };
    }),
    changePassword: protectedProcedure.input(
      z3.object({
        currentPassword: z3.string(),
        newPassword: z3.string().min(8)
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const users_result = await db.select().from(users).where(eq3(users.id, ctx.user.id)).limit(1);
      const user = users_result[0];
      if (!user || !user.passwordHash) {
        throw new TRPCError4({ code: "UNAUTHORIZED" });
      }
      const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new TRPCError4({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
      }
      const newHash = await hashPassword(input.newPassword);
      await db.update(users).set({
        passwordHash: newHash
      }).where(eq3(users.id, ctx.user.id));
      return { success: true };
    }),
    saveIntegrations: protectedProcedure.input(
      z3.object({
        connectedAccounts: z3.array(z3.enum(["ebay", "paypal", "facebook"]))
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(userProfiles).set({
        connectedAccounts: JSON.stringify(input.connectedAccounts)
      }).where(eq3(userProfiles.userId, ctx.user.id));
      return { success: true };
    }),
    saveCommunications: protectedProcedure.input(
      z3.object({
        tradeInitiated: z3.object({ email: z3.boolean(), text: z3.boolean() }),
        counterProposal: z3.object({ email: z3.boolean(), text: z3.boolean() }),
        proposalAccepted: z3.object({ email: z3.boolean(), text: z3.boolean() }),
        proposalRejected: z3.object({ email: z3.boolean(), text: z3.boolean() }),
        itemsShipped: z3.object({ email: z3.boolean(), text: z3.boolean() }),
        itemsReceived: z3.object({ email: z3.boolean(), text: z3.boolean() }),
        feedbackReceived: z3.object({ email: z3.boolean(), text: z3.boolean() }),
        systemUpdates: z3.object({ email: z3.boolean(), text: z3.boolean() }),
        marketingEmails: z3.object({ email: z3.boolean(), text: z3.boolean() })
      })
    ).mutation(async ({ ctx, input }) => {
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
          marketingEmails: input.marketingEmails
        })
      }).where(eq3(userProfiles.userId, ctx.user.id));
      return { success: true };
    }),
    savePreferences: protectedProcedure.input(
      z3.object({
        preferredCategories: z3.array(z3.enum(collectibleCategories)),
        showProfile: z3.boolean(),
        hideInventoryValue: z3.boolean(),
        receiveContactRequests: z3.boolean()
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      console.log("[savePreferences] Input:", input);
      console.log("[savePreferences] User ID:", ctx.user.id);
      const result = await db.update(userProfiles).set({
        preferredCategories: JSON.stringify(input.preferredCategories),
        showProfile: input.showProfile ? 1 : 0,
        hideInventoryValue: input.hideInventoryValue ? 1 : 0,
        receiveContactRequests: input.receiveContactRequests ? 1 : 0
      }).where(eq3(userProfiles.userId, ctx.user.id));
      console.log("[savePreferences] Update result:", result);
      return { success: true };
    }),
    createListing: protectedProcedure.input(
      z3.object({
        title: z3.string().min(3).max(160),
        category: z3.enum(collectibleCategories),
        itemType: z3.string().min(1).max(50),
        condition: z3.enum(itemConditions),
        description: z3.string().max(4e3),
        estimatedValue: z3.number().nonnegative().optional(),
        photos: z3.array(uploadedImageSchema).max(6),
        itemDetails: z3.record(z3.string(), z3.string()).optional(),
        certificationCompany: z3.string().optional(),
        certificationNumber: z3.string().optional(),
        grade: z3.string().optional()
      })
    ).mutation(({ ctx, input }) => {
      const descriptionLines = input.description.split("\n");
      let graderCompany = "";
      let grade = "";
      descriptionLines.forEach((line) => {
        if (line.startsWith("Grading Company: ")) {
          graderCompany = line.replace("Grading Company: ", "");
        } else if (line.startsWith("Grade: ")) {
          grade = line.replace("Grade: ", "");
        }
      });
      if (graderCompany) {
        const company = getGradingCompanyByName(graderCompany);
        if (company && !company.categories.includes(input.category)) {
          throw new TRPCError4({
            code: "BAD_REQUEST",
            message: `${graderCompany} does not grade ${input.category} items.`
          });
        }
        if (company && grade && grade !== "ungraded" && grade !== "raw" && !isValidGradeForCompany(graderCompany, grade)) {
          throw new TRPCError4({
            code: "BAD_REQUEST",
            message: `Grade ${grade} is not valid for ${graderCompany}. Valid grades: ${company.validGrades.join(", ")}.`
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
          itemDetails: input.itemDetails,
          certificationCompany: input.certificationCompany,
          certificationNumber: input.certificationNumber,
          grade: input.grade
        }
      );
    }),
    updateListing: protectedProcedure.input(
      z3.object({
        listingId: z3.number().int().positive(),
        title: z3.string().min(3).max(160),
        category: z3.enum(collectibleCategories),
        condition: z3.enum(itemConditions),
        description: z3.string().max(4e3),
        estimatedValue: z3.number().nonnegative().optional(),
        photos: z3.array(uploadedImageSchema).max(6),
        itemDetails: z3.record(z3.string(), z3.string()).optional(),
        certificationCompany: z3.string().optional(),
        certificationNumber: z3.string().optional(),
        grade: z3.string().optional()
      })
    ).mutation(({ ctx, input }) => {
      const descriptionLines = input.description.split("\n");
      let graderCompany = "";
      let grade = "";
      descriptionLines.forEach((line) => {
        if (line.startsWith("Grading Company: ")) {
          graderCompany = line.replace("Grading Company: ", "");
        } else if (line.startsWith("Grade: ")) {
          grade = line.replace("Grade: ", "");
        }
      });
      if (graderCompany) {
        const company = getGradingCompanyByName(graderCompany);
        if (company && !company.categories.includes(input.category)) {
          throw new TRPCError4({
            code: "BAD_REQUEST",
            message: `${graderCompany} does not grade ${input.category} items.`
          });
        }
        if (company && grade && grade !== "ungraded" && grade !== "raw" && !isValidGradeForCompany(graderCompany, grade)) {
          throw new TRPCError4({
            code: "BAD_REQUEST",
            message: `Grade ${grade} is not valid for ${graderCompany}. Valid grades: ${company.validGrades.join(", ")}.`
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
          itemDetails: input.itemDetails,
          certificationCompany: input.certificationCompany,
          certificationNumber: input.certificationNumber,
          grade: input.grade
        }
      );
    }),
    createTradeProposal: protectedProcedure.input(
      z3.object({
        requestedListingId: z3.number().int().positive(),
        note: z3.string().max(1500).optional()
      })
    ).mutation(({ ctx, input }) => {
      return createTradeProposal(
        { id: ctx.user.id, name: ctx.user.name },
        {
          requestedListingId: input.requestedListingId,
          note: input.note
        }
      );
    }),
    selectTradeProposalItems: protectedProcedure.input(
      z3.object({
        proposalId: z3.number().int().positive(),
        offeredListingIds: z3.array(z3.number().int().positive()).min(1).max(5),
        note: z3.string().max(1500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await selectTradeProposalItems({ id: ctx.user.id, name: ctx.user.name }, {
        proposalId: input.proposalId,
        selectedListingIds: input.offeredListingIds
      });
      return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
    }),
    respondToTradeProposal: protectedProcedure.input(
      z3.object({
        proposalId: z3.number().int().positive(),
        action: z3.enum(["accept", "refuse", "counter", "complete", "cancel"]),
        note: z3.string().max(1500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await respondToTradeProposal({ id: ctx.user.id, name: ctx.user.name }, {
        proposalId: input.proposalId,
        response: input.action === "accept" ? "accepted" : "declined"
      });
      return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
    }),
    sendTradeMessage: protectedProcedure.input(
      z3.object({
        proposalId: z3.number().int().positive(),
        message: z3.string().min(1).max(1200)
      })
    ).mutation(async ({ ctx, input }) => {
      await sendTradeMessage({ id: ctx.user.id, name: ctx.user.name }, { proposalId: input.proposalId, message: input.message });
      return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
    }),
    toggleWatchlist: protectedProcedure.input(
      z3.object({
        listingId: z3.number().int().positive()
      })
    ).mutation(({ ctx, input }) => {
      return toggleWatchlist(ctx.user.id, input.listingId);
    }),
    toggleListingStatus: protectedProcedure.input(
      z3.object({
        listingId: z3.number().int().positive(),
        isActive: z3.boolean()
      })
    ).mutation(({ ctx, input }) => {
      return toggleListingStatus({ id: ctx.user.id, name: ctx.user.name }, { listingId: input.listingId, isActive: input.isActive });
    }),
    bulkUpdateListingStatus: protectedProcedure.input(
      z3.object({
        listingIds: z3.array(z3.number().int().positive()),
        newStatus: z3.boolean()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        await bulkUpdateListingStatus({ id: ctx.user.id, name: ctx.user.name }, { listingIds: input.listingIds, isActive: input.newStatus });
        return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
      } catch (error) {
        console.error("[bulkUpdateListingStatus mutation] Error:", error);
        if (error instanceof Error) {
          throw new TRPCError4({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message
          });
        }
        throw error;
      }
    }),
    bulkDeleteListings: protectedProcedure.input(
      z3.object({
        listingIds: z3.array(z3.number().int().positive())
      })
    ).mutation(async ({ ctx, input }) => {
      const result = await bulkDeleteListings({ id: ctx.user.id, name: ctx.user.name }, { listingIds: input.listingIds });
      return {
        ...result,
        dashboard: await getDashboardData({ id: ctx.user.id, name: ctx.user.name })
      };
    }),
    restoreDeletedListings: protectedProcedure.input(
      z3.object({
        deletedListings: z3.array(z3.any()),
        deletedPhotos: z3.array(z3.any())
      })
    ).mutation(async ({ ctx, input }) => {
      await restoreDeletedListings({ id: ctx.user.id, name: ctx.user.name }, { listingIds: input.deletedListings });
      return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
    }),
    adminDeleteListing: protectedProcedure.input(
      z3.object({
        listingId: z3.number().int().positive(),
        deletionReason: z3.string().max(500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN", message: "Only admins can delete listings" });
      return adminDeleteListing({ id: ctx.user.id, name: ctx.user.name }, input);
    }),
    adminBulkDeleteListings: protectedProcedure.input(
      z3.object({
        listingIds: z3.array(z3.number().int().positive()),
        deletionReason: z3.string().max(500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN", message: "Only admins can delete listings" });
      return adminBulkDeleteListings({ id: ctx.user.id, name: ctx.user.name }, input);
    }),
    leaveTradeReview: protectedProcedure.input(
      z3.object({
        proposalId: z3.number().int().positive(),
        rating: z3.number().min(1).max(5),
        review: z3.string().max(1500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await leaveTradeReview({ id: ctx.user.id, name: ctx.user.name }, input);
      return getDashboardData({ id: ctx.user.id, name: ctx.user.name });
    }),
    reportUser: protectedProcedure.input(reportUserSchema).mutation(async ({ ctx, input }) => {
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
          `Evidence notes: ${input.supportingNotes?.trim() || "None provided"}`
        ].join("\n")
      });
      return {
        success: delivered,
        message: delivered ? "Your report was sent to the Tradebilia moderation review queue." : "Your report could not be delivered right now. Please try again shortly."
      };
    }),
    referralRequest: protectedProcedure.input(referralRequestSchema).mutation(async ({ ctx, input }) => {
      const referrerName = ctx.user.name?.trim() || `Collector ${ctx.user.id}`;
      const referrerFirstName = ctx.user?.firstName || "";
      const referrerLastName = ctx.user?.lastName || "";
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
          message: input.message.trim()
        });
        return {
          success: true,
          message: "Your referral request has been submitted successfully."
        };
      } catch (error) {
        console.error("[referralRequest] Failed to save to database:", error);
        return {
          success: false,
          message: "Your referral request could not be saved. Please try again shortly."
        };
      }
    }),
    saveDraft: protectedProcedure.input(
      z3.object({
        title: z3.string().min(0).max(160).optional().default(""),
        category: z3.enum(collectibleCategories),
        grade: z3.string().max(10),
        graderCompany: z3.string().max(100),
        certificationNumber: z3.string().max(100).optional(),
        estimatedValue: z3.number().nonnegative().optional(),
        categoryFields: z3.record(z3.string(), z3.string()).optional().default({}),
        additionalNotes: z3.string().max(4e3).optional(),
        photos: z3.array(uploadedImageSchema).optional().default([])
      })
    ).mutation(({ ctx, input }) => {
      const company = getGradingCompanyByName(input.graderCompany);
      if (company && !company.categories.includes(input.category)) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: `${input.graderCompany} does not grade ${input.category} items.`
        });
      }
      if (company && input.grade !== "ungraded" && input.grade !== "raw" && !isValidGradeForCompany(input.graderCompany, input.grade)) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: `Grade ${input.grade} is not valid for ${input.graderCompany}. Valid grades: ${company.validGrades.join(", ")}.`
        });
      }
      return saveDraft({ id: ctx.user.id, name: ctx.user.name }, {
        title: input.title,
        category: input.category,
        condition: "poor",
        // Will be updated when user completes the listing
        description: input.additionalNotes || "",
        grade: input.grade,
        graderCompany: input.graderCompany,
        certificationNumber: input.certificationNumber,
        estimatedValue: input.estimatedValue,
        photos: input.photos
      });
    }),
    getDrafts: protectedProcedure.query(({ ctx }) => {
      return getDrafts({ id: ctx.user.id, name: ctx.user.name });
    }),
    getDraftById: protectedProcedure.input(z3.object({ draftId: z3.number().int().positive() })).query(({ ctx, input }) => {
      return getDraftById({ id: ctx.user.id, name: ctx.user.name }, input.draftId);
    }),
    updateDraft: protectedProcedure.input(
      z3.object({
        draftId: z3.number().int().positive(),
        title: z3.string().min(1).max(160),
        category: z3.enum(collectibleCategories),
        condition: z3.enum(itemConditions),
        description: z3.string(),
        grade: z3.number().optional(),
        graderCompany: z3.string().optional(),
        certificationNumber: z3.string().optional(),
        estimatedValue: z3.number().optional(),
        photos: z3.array(z3.object({ name: z3.string(), type: z3.string(), contentBase64: z3.string() }))
      })
    ).mutation(({ ctx, input }) => {
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
        photos: input.photos
      });
    }),
    deleteDraft: protectedProcedure.input(
      z3.object({
        draftId: z3.number().int().positive()
      })
    ).mutation(({ ctx, input }) => {
      return deleteDraft({ id: ctx.user.id, name: ctx.user.name }, { draftId: input.draftId });
    }),
    createForumPost: protectedProcedure.input(
      z3.object({
        category: z3.string().min(1).max(64),
        title: z3.string().min(3).max(255),
        content: z3.string().min(10).max(5e3)
      })
    ).mutation(({ ctx, input }) => {
      return createForumPost({ id: ctx.user.id, name: ctx.user.name }, input);
    }),
    getForumPosts: publicProcedure.input(
      z3.object({
        category: z3.string().optional(),
        sortBy: z3.enum(["newest", "popular", "replies"]).default("newest")
      })
    ).query(({ input }) => {
      return getForumPosts(input.category, input.sortBy);
    }),
    getForumPostDetail: publicProcedure.input(z3.object({ postId: z3.number().int().positive() })).query(({ input }) => {
      return getForumPostById(input.postId);
    }),
    getForumReplies: publicProcedure.input(z3.object({ postId: z3.number().int().positive() })).query(({ input }) => {
      return getForumReplies(input.postId);
    }),
    addForumReply: protectedProcedure.input(
      z3.object({
        postId: z3.number().int().positive(),
        content: z3.string().min(1).max(2e3)
      })
    ).mutation(({ ctx, input }) => {
      return addForumReply({ id: ctx.user.id, name: ctx.user.name }, input);
    }),
    submitReport: protectedProcedure.input(
      z3.object({
        reportedUserId: z3.number().int().positive(),
        reason: z3.string().min(1).max(100),
        description: z3.string().min(10).max(2e3),
        evidence: z3.string().max(500).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      if (input.reportedUserId === ctx.user.id) {
        throw new TRPCError4({ code: "BAD_REQUEST", message: "You cannot report yourself" });
      }
      return submitUserReport({
        reportedUserId: input.reportedUserId,
        reporterUserId: ctx.user.id,
        reason: input.reason,
        description: input.description,
        evidence: input.evidence
      });
    }),
    sendInquiry: protectedProcedure.input(
      z3.object({
        listingId: z3.number().int().positive(),
        recipientId: z3.number().int().positive(),
        subject: z3.string().min(1).max(255),
        message: z3.string().min(1).max(5e3)
      })
    ).mutation(async ({ ctx, input }) => {
      return sendItemInquiry({ id: ctx.user.id, name: ctx.user.name }, input);
    }),
    getUnreadInquiries: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadInquiries(ctx.user.id);
    }),
    getInquiries: protectedProcedure.input(
      z3.object({
        limit: z3.number().int().positive().default(50),
        offset: z3.number().int().nonnegative().default(0)
      })
    ).query(async ({ ctx, input }) => {
      return getInquiriesByUser(ctx.user.id, input.limit, input.offset);
    }),
    markInquiryAsRead: protectedProcedure.input(z3.object({ inquiryId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      return markInquiryAsRead(input.inquiryId, ctx.user.id);
    }),
    sendReply: protectedProcedure.input(z3.object({ inquiryId: z3.number().int().positive(), message: z3.string().min(1).max(5e3) })).mutation(async ({ ctx, input }) => {
      return sendInquiryReply(input.inquiryId, ctx.user.id, input.message);
    }),
    getReplies: protectedProcedure.input(z3.object({ inquiryId: z3.number().int().positive() })).query(async ({ input }) => {
      return getRepliesByInquiry(input.inquiryId);
    }),
    deleteInquiry: protectedProcedure.input(z3.object({ inquiryId: z3.number().int().positive() })).mutation(async ({ input, ctx }) => {
      await deleteInquiry(input.inquiryId, ctx.user.id);
      return { success: true };
    }),
    getDeleted: protectedProcedure.query(async ({ ctx }) => {
      return getDeletedInquiries(ctx.user.id);
    }),
    emptyDeleted: protectedProcedure.mutation(async ({ ctx }) => {
      await emptyDeletedInquiries(ctx.user.id);
      return { success: true };
    })
  }),
  ebay: router({
    getAuthUrl: protectedProcedure.input(z3.object({ state: z3.string() })).query(({ input }) => {
      return getEbayAuthUrl(input.state);
    }),
    connectAccount: protectedProcedure.input(z3.object({ code: z3.string() })).mutation(async ({ ctx, input }) => {
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
          ebayTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1e3)
        });
        for (const fb of feedback) {
          await storeEbayFeedback({
            userId: ctx.user.id,
            ...fb
          });
        }
        if (isLowFeedback) {
          await flagLowFeedback({
            userId: ctx.user.id,
            feedbackScore: userInfo.feedbackScore,
            feedbackPercentage: userInfo.feedbackPercentage,
            flaggedReason: `Low eBay feedback: ${userInfo.feedbackPercentage}%`
          });
        }
        return {
          success: true,
          username: userInfo.username,
          feedbackScore: userInfo.feedbackScore,
          feedbackPercentage: userInfo.feedbackPercentage
        };
      } catch (error) {
        console.error("eBay connection error:", error);
        throw new TRPCError4({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect eBay account"
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
      await db.update(users).set({
        ebayUsername: null,
        ebayUserId: null,
        ebayFeedbackScore: null,
        ebayFeedbackPercentage: null,
        ebayMemberSince: null,
        ebayConnectedAt: null,
        ebayAccessToken: null,
        ebayRefreshToken: null,
        ebayTokenExpiresAt: null
      }).where(eq3(users.id, ctx.user.id));
      return { success: true };
    })
  }),
  admin: router({
    // Platform statistics
    getPlatformStatistics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      const db = await requireDb();
      const memberCount = await db.select({ count: sql3`count(*)` }).from(users);
      const listingCount = await db.select({ count: sql3`count(*)` }).from(listings);
      const tradeCount = await db.select({ count: sql3`count(*)` }).from(tradeProposals);
      const totalValue = await db.select({ total: sql3`sum(${listings.estimatedValue})` }).from(listings);
      return {
        totalMembers: Number(memberCount[0]?.count || 0),
        totalListings: Number(listingCount[0]?.count || 0),
        totalTrades: Number(tradeCount[0]?.count || 0),
        totalValue: Number(totalValue[0]?.total || 0)
      };
    }),
    // User management
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
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
        contactCountry: userProfiles.contactCountry
      }).from(users).leftJoin(userProfiles, eq3(users.id, userProfiles.userId));
      const listingCounts = await db.select({
        userId: listings.ownerId,
        count: sql3`COUNT(*)`
      }).from(listings).where(eq3(listings.status, "active")).groupBy(listings.ownerId);
      const countMap = new Map(listingCounts.map((lc) => [lc.userId, lc.count]));
      const ONLINE_TIMEOUT = 5 * 60 * 1e3;
      const now = Date.now();
      return allUsers.map((user) => ({
        ...user,
        itemsListed: countMap.get(user.id) || 0,
        isOnline: now - new Date(user.lastActivityAt).getTime() < ONLINE_TIMEOUT
      }));
    }),
    deleteUser: protectedProcedure.input(z3.object({ userId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      console.log(`[deleteUser] Starting deletion for userId: ${input.userId}`);
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      if (input.userId === ctx.user.id) throw new TRPCError4({ code: "BAD_REQUEST", message: "Cannot delete yourself" });
      const db = await requireDb();
      const userToDelete = await db.select().from(users).where(eq3(users.id, input.userId)).limit(1);
      const userProfile = await db.select().from(userProfiles).where(eq3(userProfiles.userId, input.userId)).limit(1);
      if (!userToDelete.length) throw new TRPCError4({ code: "NOT_FOUND", message: "User not found" });
      const [activeTrades] = await db.execute(
        sql3`SELECT COUNT(*) as cnt FROM tradeProposals WHERE (requesterId = ${input.userId} OR recipientId = ${input.userId}) AND status IN ('pending', 'negotiating', 'accepted', 'shipped')`
      );
      if (activeTrades?.[0]?.cnt > 0) {
        throw new TRPCError4({ code: "BAD_REQUEST", message: "Cannot delete account: user has active trades. Please resolve all active trades first." });
      }
      const user = userToDelete[0];
      const profile = userProfile[0];
      console.log(`[deleteUser] Found user: ${user.username}, profile exists: ${!!profile}`);
      console.log(`[deleteUser] Deleting trade messages...`);
      await db.delete(tradeMessages).where(eq3(tradeMessages.senderId, input.userId));
      console.log(`[deleteUser] Deleting trade reviews...`);
      await db.delete(tradeReviews).where(or3(
        eq3(tradeReviews.reviewerId, input.userId),
        eq3(tradeReviews.revieweeId, input.userId)
      ));
      console.log(`[deleteUser] Deleting trade proposals...`);
      await db.delete(tradeProposals).where(or3(
        eq3(tradeProposals.requesterId, input.userId),
        eq3(tradeProposals.recipientId, input.userId)
      ));
      console.log(`[deleteUser] Deleting watchlist entries...`);
      await db.delete(watchlistEntries).where(eq3(watchlistEntries.userId, input.userId));
      console.log(`[deleteUser] Deleting draft listings...`);
      await db.delete(draftListings).where(eq3(draftListings.userId, input.userId));
      console.log(`[deleteUser] Deleting password reset tokens...`);
      await db.delete(passwordResetTokens).where(eq3(passwordResetTokens.userId, input.userId));
      console.log(`[deleteUser] Deleting listings...`);
      const listingsDeleted = await db.delete(listings).where(eq3(listings.ownerId, input.userId));
      console.log(`[deleteUser] Deleted listings, result:`, listingsDeleted);
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
          reason: "Admin deletion"
        });
      } catch (err) {
        console.log(`[deleteUser] Error inserting into deletedAccounts:`, err);
        throw err;
      }
      console.log(`[deleteUser] Deleting profile...`);
      const profileDeleted = await db.delete(userProfiles).where(eq3(userProfiles.userId, input.userId));
      console.log(`[deleteUser] Deleted profile, result:`, profileDeleted);
      console.log(`[deleteUser] Deleting user...`);
      const deleteResult = await db.delete(users).where(eq3(users.id, input.userId));
      console.log(`[deleteUser] Deleted user ${input.userId}, result:`, deleteResult);
      return { success: true };
    }),
    updateUserRole: protectedProcedure.input(z3.object({ userId: z3.number().int().positive(), role: z3.enum(["user", "admin"]) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      const db = await requireDb();
      await db.update(users).set({ role: input.role }).where(eq3(users.id, input.userId));
      return { success: true };
    }),
    updateUser: protectedProcedure.input(z3.object({
      userId: z3.number().int().positive(),
      firstName: z3.string().max(100).optional(),
      lastName: z3.string().max(100).optional(),
      displayName: z3.string().max(100).optional(),
      contactFullName: z3.string().max(200).optional(),
      contactPhone: z3.string().max(20).optional(),
      contactEmail: z3.string().email().optional(),
      contactAddress: z3.string().max(255).optional(),
      contactTown: z3.string().max(100).optional(),
      contactState: z3.string().max(100).optional(),
      contactZipCode: z3.string().max(20).optional(),
      contactCountry: z3.string().max(100).optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      const db = await requireDb();
      const { userId, ...updateData } = input;
      const usersTableFields = {};
      const userProfilesTableFields = {};
      if (updateData.displayName !== void 0 && updateData.displayName !== null && updateData.displayName !== "") {
        usersTableFields.displayName = updateData.displayName;
      }
      const profileFields = ["firstName", "lastName", "contactFullName", "contactPhone", "contactEmail", "contactAddress", "contactTown", "contactState", "contactZipCode", "contactCountry"];
      profileFields.forEach((field) => {
        const value = updateData[field];
        if (value !== void 0 && value !== null && value !== "") {
          userProfilesTableFields[field] = value;
        }
      });
      if (Object.keys(usersTableFields).length > 0) {
        await db.update(users).set(usersTableFields).where(eq3(users.id, userId));
      }
      if (Object.keys(userProfilesTableFields).length > 0) {
        await db.update(userProfiles).set(userProfilesTableFields).where(eq3(userProfiles.userId, userId));
      }
      return { success: true };
    }),
    // Deleted accounts management
    getDeletedAccounts: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      const db = await requireDb();
      const deleted = await db.select().from(deletedAccounts).orderBy((t2) => t2.deletedAt);
      return deleted;
    }),
    // Listings management
    getAllListings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
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
          lastName: userProfiles.lastName
        }
      }).from(listings).leftJoin(userProfiles, eq3(listings.ownerId, userProfiles.userId)).orderBy(desc3(listings.createdAt));
      return allListings;
    }),
    getAllTrades: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
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
        completedAt: tradeProposals.completedAt
      }).from(tradeProposals).leftJoin(users, eq3(tradeProposals.requesterId, users.id)).leftJoin(listings, eq3(tradeProposals.requestedListingId, listings.id)).orderBy(desc3(tradeProposals.createdAt));
      return allTrades;
    }),
    // Reported users management
    getReportedUsers: protectedProcedure.input(
      z3.object({
        status: z3.enum(["pending", "reviewed", "dismissed", "action_taken"]).optional(),
        limit: z3.number().int().positive().default(50),
        offset: z3.number().int().nonnegative().default(0)
      })
    ).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      return getUserReports({
        status: input.status,
        limit: input.limit,
        offset: input.offset
      });
    }),
    getReportDetails: protectedProcedure.input(z3.object({ reportId: z3.string() })).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      return getUserReportDetails(input.reportId);
    }),
    updateReportStatus: protectedProcedure.input(
      z3.object({
        reportId: z3.string(),
        status: z3.enum(["pending", "reviewed", "dismissed", "action_taken"]),
        adminNotes: z3.string().max(2e3).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      await updateReportStatus({
        reportId: input.reportId,
        status: input.status,
        adminNotes: input.adminNotes,
        reviewedBy: ctx.user.id
      });
      return { success: true };
    }),
    // Referral management
    getAllReferrals: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      return await getAllReferralRequests();
    }),
    updateReferralStatus: protectedProcedure.input(z3.object({
      referralId: z3.number(),
      status: z3.enum(["pending", "reviewed", "approved", "rejected"]),
      adminNotes: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      await updateReferralRequestStatus(input.referralId, input.status, input.adminNotes, ctx.user.id);
      return { success: true };
    }),
    sendBulkEmailToReferrals: protectedProcedure.input(z3.object({ referralIds: z3.array(z3.number()), subject: z3.string().min(1), message: z3.string().min(1) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      const referrals = await getReferralsByIds(input.referralIds);
      if (referrals.length === 0) throw new TRPCError4({ code: "NOT_FOUND" });
      await markReferralsAsEmailed(input.referralIds);
      return { success: true, emailsSent: referrals.length };
    }),
    removeReferralByEmail: protectedProcedure.input(z3.object({ referralId: z3.number(), userId: z3.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      await markReferralAsJoined(input.referralId, input.userId);
      return { success: true };
    }),
    deleteReferral: protectedProcedure.input(z3.object({ referralId: z3.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      await removeReferral(input.referralId);
      return { success: true };
    }),
    bulkDeleteReferrals: protectedProcedure.input(z3.object({ referralIds: z3.array(z3.number()) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      if (input.referralIds.length === 0) throw new TRPCError4({ code: "BAD_REQUEST", message: "No referrals selected" });
      const db = await requireDb();
      await db.delete(referralRequests).where(inArray3(referralRequests.id, input.referralIds));
      return { success: true, deletedCount: input.referralIds.length };
    }),
    // User suspension management
    getSuspendedUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      return await getSuspendedUsers();
    }),
    suspendUser: protectedProcedure.input(z3.object({ userId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      if (input.userId === ctx.user.id) throw new TRPCError4({ code: "BAD_REQUEST", message: "Cannot suspend yourself" });
      return await suspendUser(input.userId);
    }),
    unsuspendUser: protectedProcedure.input(z3.object({ userId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      return await unsuspendUser(input.userId);
    })
  }),
  // Online status procedures
  favorites: router({
    trackView: publicProcedure.input(z3.object({ listingId: z3.number().int().positive() })).mutation(async ({ input }) => {
      await trackListingView(input.listingId);
      return { success: true };
    }),
    addToFavorites: protectedProcedure.input(z3.object({ listingId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const success = await addToFavorites(ctx.user.id, input.listingId);
      return { success };
    }),
    removeFromFavorites: protectedProcedure.input(z3.object({ listingId: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const success = await removeFromFavorites(ctx.user.id, input.listingId);
      return { success };
    }),
    isFavorited: protectedProcedure.input(z3.object({ listingId: z3.number().int().positive() })).query(async ({ ctx, input }) => {
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
    })
  }),
  onlineStatus: router({
    updateActivity: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      if (ctx.user?.id) {
        await db.update(users).set({ lastActivityAt: mysqlNow() }).where(eq3(users.id, ctx.user.id));
      }
      return { success: true };
    }),
    getSellerOnlineStatus: publicProcedure.input(z3.object({ sellerId: z3.number().int().positive() })).query(async ({ input }) => {
      const db = await requireDb();
      const seller = await db.select({ lastActivityAt: users.lastActivityAt, id: users.id, name: users.name }).from(users).where(eq3(users.id, input.sellerId)).limit(1);
      if (!seller.length) return { isOnline: false };
      const lastActivity = seller[0].lastActivityAt;
      const now = /* @__PURE__ */ new Date();
      const timeSinceActivity = now.getTime() - new Date(lastActivity).getTime();
      const ONLINE_STATUS_TIMEOUT_MS = 5 * 60 * 1e3;
      const isOnline = timeSinceActivity < ONLINE_STATUS_TIMEOUT_MS;
      return { isOnline, lastActivityAt: lastActivity };
    }),
    getMultipleSellerOnlineStatus: publicProcedure.input(z3.object({ sellerIds: z3.array(z3.number().int().positive()) })).query(async ({ input }) => {
      if (!input.sellerIds.length) return {};
      const db = await requireDb();
      const sellers = await db.select({ id: users.id, lastActivityAt: users.lastActivityAt }).from(users).where(inArray3(users.id, input.sellerIds));
      const ONLINE_STATUS_TIMEOUT_MS = 5 * 60 * 1e3;
      const now = /* @__PURE__ */ new Date();
      const result = {};
      sellers.forEach((seller) => {
        const timeSinceActivity = now.getTime() - new Date(seller.lastActivityAt).getTime();
        result[seller.id] = {
          isOnline: timeSinceActivity < ONLINE_STATUS_TIMEOUT_MS,
          lastActivityAt: seller.lastActivityAt
        };
      });
      return result;
    })
  }),
  conventions: router({
    list: publicProcedure.input(z3.object({
      category: z3.string().optional(),
      country: z3.string().optional(),
      state: z3.string().optional()
    }).optional()).query(({ input }) => getConventions(input ?? {})),
    upcoming: publicProcedure.input(z3.object({ limit: z3.number().min(1).max(10).optional() }).optional()).query(async ({ ctx, input }) => {
      if (!ctx.user) return [];
      const { userProfiles: userProfiles3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq4 } = await import("drizzle-orm");
      const db = await (await Promise.resolve().then(() => (init_db(), db_exports))).requireDb();
      const [profile] = await db.select({ state: userProfiles3.contactState, country: userProfiles3.contactCountry }).from(userProfiles3).where(eq4(userProfiles3.userId, ctx.user.id));
      const userLocation = profile ? { state: profile.state || null, country: profile.country || null } : {};
      return getUpcomingConventions(input?.limit ?? 3, userLocation);
    }),
    submit: publicProcedure.input(z3.object({
      name: z3.string().min(2).max(255),
      category: z3.string().min(1),
      categories: z3.array(z3.string()).optional(),
      // multi-category support
      startDate: z3.string().min(8).max(20),
      endDate: z3.string().max(20).optional(),
      city: z3.string().max(100).optional(),
      state: z3.string().max(100).optional(),
      country: z3.string().min(2).max(100),
      venue: z3.string().max(255).optional(),
      website: z3.string().max(500).optional(),
      admission: z3.string().max(100).optional(),
      description: z3.string().max(2e3).optional()
    })).mutation(({ ctx, input }) => submitConvention({ ...input, submittedBy: ctx.user?.id })),
    pending: publicProcedure.query(() => getPendingConventions()),
    approve: publicProcedure.input(z3.object({ id: z3.number() })).mutation(({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      return approveConvention(input.id, ctx.user.id);
    }),
    reject: publicProcedure.input(z3.object({ id: z3.number() })).mutation(({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      return rejectConvention(input.id, ctx.user.id);
    }),
    delete: publicProcedure.input(z3.object({ id: z3.number() })).mutation(({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      return deleteConvention(input.id);
    }),
    scrape: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
      const { runConventionScraper: runConventionScraper2 } = await Promise.resolve().then(() => (init_conventionScraper(), conventionScraper_exports));
      return runConventionScraper2();
    })
  })
});

// server/_core/context.ts
init_customAuth();
init_const();
async function createContext(opts) {
  let user = null;
  try {
    const cookieHeader = opts.req.headers.cookie;
    const cookies = /* @__PURE__ */ new Map();
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const [key, value] = cookie.split("=");
        if (key && value) {
          cookies.set(key.trim(), decodeURIComponent(value.trim()));
        }
      });
    }
    const sessionCookie = cookies.get(COOKIE_NAME);
    if (sessionCookie) {
      user = await customAuth.getUserFromSession(sessionCookie);
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEBUG_COLLECTOR !== "true") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  const clientTemplate = path2.resolve(
    import.meta.dirname,
    "../..",
    "client",
    "index.html"
  );
  let cachedTemplate = null;
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      if (!cachedTemplate) {
        cachedTemplate = await fs2.promises.readFile(clientTemplate, "utf-8");
      }
      const page = await vite.transformIndexHtml(url, cachedTemplate);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      cachedTemplate = null;
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

// server/_core/index.ts
init_schema();
import { desc as desc4, gte as gte2 } from "drizzle-orm";

// server/_core/startupChecks.ts
import { sql as sql4 } from "drizzle-orm";
var REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "VITE_APP_ID",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY"
];
function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error("========================================================");
    console.error("STARTUP CHECK FAILED: missing required environment vars:");
    for (const name of missing) console.error(`  - ${name}`);
    console.error("Check that the .env file exists in the project root and");
    console.error("contains all required values, then restart the server.");
    console.error("========================================================");
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  try {
    new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error(
      "DATABASE_URL is set but is not a valid URL. Check the .env file for quoting/formatting errors."
    );
  }
  console.log("[startup] Environment check: PASS (all required variables present)");
}
async function validateDatabaseConnection() {
  const { requireDb: requireDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  try {
    const db = await requireDb2();
    await db.execute(sql4`select 1`);
    console.log("[startup] Database check: PASS (connection verified)");
  } catch (error) {
    console.error("========================================================");
    console.error("STARTUP CHECK FAILED: cannot connect to the database.");
    console.error("Verify DATABASE_URL credentials and network access.");
    console.error("========================================================");
    throw error;
  }
}

// server/_core/index.ts
dotenv.config();
function listenOnPort(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port);
  });
}
async function listenWithRetry(server, port, attempts = 5, delayMs = 500) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await listenOnPort(server, port);
      return;
    } catch (err) {
      if (err?.code === "EADDRINUSE" && attempt < attempts) {
        console.warn(
          `[startup] Port ${port} busy (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
}
async function startServer() {
  validateEnvironment();
  await validateDatabaseConnection();
  const app = express2();
  const server = createServer(app);
  app.get("/health", async (_req, res) => {
    try {
      const { requireDb: requireDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const db = await requireDb2();
      const { sql: sql5 } = await import("drizzle-orm");
      await db.execute(sql5`select 1`);
      res.json({ status: "ok", database: "connected", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch {
      res.status(503).json({ status: "degraded", database: "unreachable", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app.post("/api/scheduled/cleanupExpiredDrafts", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }
      const { requireDb: requireDb2, deleteDraftsOlderThan: deleteDraftsOlderThan2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const db = await requireDb2();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const deletedCount = await deleteDraftsOlderThan2(db, thirtyDaysAgo);
      res.json({ ok: true, deletedCount, cutoffDate: thirtyDaysAgo.toISOString() });
    } catch (error) {
      console.error("[cleanupExpiredDrafts] Error:", error);
      res.status(500).json({
        error: error.message,
        stack: error.stack,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.post("/api/scheduled/referralDigest", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }
      const { requireDb: requireDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const db = await requireDb2();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
      const pendingReferrals = await db.select().from(referralRequests).where(gte2(referralRequests.createdAt, threeDaysAgo)).orderBy(desc4(referralRequests.createdAt));
      if (pendingReferrals.length === 0) {
        return res.json({ ok: true, skipped: "no-referrals" });
      }
      const referralLines = pendingReferrals.map(
        (ref) => `\u2022 ${ref.collectorName} (${ref.collectorEmail}) - Focus: ${ref.collectorFocus} - Referrer: ${ref.referrerFirstName} ${ref.referrerLastName}`
      );
      const delivered = await notifyOwner({
        title: `Tradebilia Referral Digest - ${pendingReferrals.length} new referrals`,
        content: [
          `You have ${pendingReferrals.length} new referral request(s) from the past 3 days:
`,
          referralLines.join("\n")
        ].join("\n")
      });
      res.json({ ok: true, referralCount: pendingReferrals.length, notified: delivered });
    } catch (error) {
      console.error("[referralDigest] Error:", error);
      res.status(500).json({
        error: error.message,
        stack: error.stack,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.post("/api/scheduled/tradeReminders", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }
      const { requireDb: requireDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const db = await requireDb2();
      const { sql: sql5 } = await import("drizzle-orm");
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      let autoCancelled = 0;
      let acceptanceTimedOut = 0;
      let receiptEscalated = 0;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
      const [staleResult] = await db.execute(
        sql5`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Auto-cancelled: 30 days of no activity', updatedAt = ${now} WHERE status IN ('pending', 'negotiating') AND lastActivityAt IS NOT NULL AND lastActivityAt < ${thirtyDaysAgo}`
      );
      autoCancelled = staleResult?.affectedRows || 0;
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
      const [pendingAcceptances] = await db.execute(
        sql5`SELECT proposalId FROM tradeReceiptConfirmation WHERE confirmationType = 'accepted' AND confirmedAt < ${threeDaysAgo}`
      );
      for (const row of pendingAcceptances || []) {
        await db.execute(
          sql5`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Auto-cancelled: 72-hour acceptance window expired', updatedAt = ${now} WHERE id = ${row.proposalId} AND status = 'negotiating'`
        );
        await db.execute(
          sql5`DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${row.proposalId} AND confirmationType = 'accepted'`
        );
        acceptanceTimedOut++;
      }
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
      const [overdueShipments] = await db.execute(
        sql5`SELECT DISTINCT proposalId FROM tradeTrackingNumbers WHERE submittedAt < ${fifteenDaysAgo} AND proposalId NOT IN (SELECT proposalId FROM tradeReceiptConfirmation WHERE confirmationType = 'received') AND proposalId IN (SELECT id FROM tradeProposals WHERE status IN ('accepted', 'shipped'))`
      );
      for (const row of overdueShipments || []) {
        await db.execute(
          sql5`UPDATE tradeProposals SET status = 'disputed', declineReason = 'Auto-escalated: Receipt not confirmed within 15 days', updatedAt = ${now} WHERE id = ${row.proposalId}`
        );
        await db.execute(
          sql5`INSERT INTO tradeAdminLog (proposalId, eventType, details, createdAt) VALUES (${row.proposalId}, 'disputed', 'Auto-escalated: 15-day receipt timeout', ${now})`
        );
        receiptEscalated++;
      }
      res.json({ ok: true, autoCancelled, acceptanceTimedOut, receiptEscalated, timestamp: now });
    } catch (error) {
      console.error("[tradeReminders] Error:", error);
      res.status(500).json({ error: error.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  }
  const port = parseInt(process.env.PORT || "3000", 10);
  await listenWithRetry(server, port);
  console.log(`[startup] Port check: PASS (bound to ${port})`);
  console.log(`Server running on http://localhost:${port}/`);
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] Received ${signal}, closing server...`);
    server.closeAllConnections?.();
    server.close(async () => {
      try {
        const { closeDb: closeDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        await closeDb2();
      } catch {
      }
      console.log("[shutdown] Clean exit.");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 2e3).unref();
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
startServer().catch((err) => {
  console.error("[startup] FATAL: server failed to start:", err?.message ?? err);
  process.exit(1);
});
