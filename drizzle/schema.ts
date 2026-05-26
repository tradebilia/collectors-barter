import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  displayName: varchar("displayName", { length: 255 }),
  avatarUrl: text("avatarUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  securityQuestion: varchar("securityQuestion", { length: 255 }),
  securityAnswerHash: varchar("securityAnswerHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  ebayUsername: varchar("ebayUsername", { length: 64 }),
  ebayUserId: varchar("ebayUserId", { length: 64 }),
  ebayFeedbackScore: int("ebayFeedbackScore"),
  ebayFeedbackPercentage: decimal("ebayFeedbackPercentage", { precision: 5, scale: 2 }),
  ebayMemberSince: timestamp("ebayMemberSince"),
  ebayConnectedAt: timestamp("ebayConnectedAt"),
  ebayAccessToken: text("ebayAccessToken"),
  ebayRefreshToken: text("ebayRefreshToken"),
  ebayTokenExpiresAt: timestamp("ebayTokenExpiresAt"),
});

// Online status is considered active if lastActivityAt is within the last 5 minutes
export const ONLINE_STATUS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const collectibleCategories = [
  "comics",
  "sports_cards",
  "vintage_toys",
  "video_games",
  "stamps",
  "coins",
  "pokemon",
  "movies",
  "autographs",
  "disney_pins",
] as const;

export const itemConditions = [
  "mint",
  "near_mint",
  "very_good",
  "good",
  "fair",
  "poor",
] as const;

export const listingStatuses = ["active", "traded", "archived"] as const;
export const tradeStatuses = [
  "pending",
  "accepted",
  "declined",
  "completed",
  "cancelled",
] as const;

export const gradeValues = [
  "ungraded",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
  "5.5",
  "6",
  "6.5",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
] as const;

export const userProfiles = mysqlTable(
  "userProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    displayName: varchar("displayName", { length: 120 }).notNull(),
    firstName: varchar("firstName", { length: 100 }),
    lastName: varchar("lastName", { length: 100 }),
    avatarUrl: text("avatarUrl"),
    avatarKey: varchar("avatarKey", { length: 255 }),
    bio: text("bio"),
    contactFullName: varchar("contactFullName", { length: 160 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 40 }),
    contactAddress: text("contactAddress"),
    contactTown: varchar("contactTown", { length: 100 }),
    contactState: varchar("contactState", { length: 100 }),
    contactZipCode: varchar("contactZipCode", { length: 20 }),
    contactCountry: varchar("contactCountry", { length: 100 }),
    acceptedTerms: boolean("acceptedTerms").default(false).notNull(),
    isMerchant: boolean("isMerchant").default(false).notNull(),
    securityQuestion: varchar("securityQuestion", { length: 255 }),
    securityAnswer: varchar("securityAnswer", { length: 255 }),
    preferredCategories: text("preferredCategories"),
    notificationPreferences: text("notificationPreferences"),
    connectedAccounts: text("connectedAccounts"),
    showProfile: boolean("showProfile").default(true).notNull(),
    hideInventoryValue: boolean("hideInventoryValue").default(false).notNull(),
    receiveContactRequests: boolean("receiveContactRequests").default(true).notNull(),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    phoneVerified: boolean("phoneVerified").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdUnique: uniqueIndex("userProfiles_userId_unique").on(table.userId),
  }),
);

export const listings = mysqlTable(
  "listings",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id),
    title: varchar("title", { length: 160 }).notNull(),
    category: mysqlEnum("category", collectibleCategories).notNull(),
    condition: mysqlEnum("condition", itemConditions).notNull(),
    grade: mysqlEnum("grade", gradeValues).default("ungraded").notNull(),
    certificationCompany: varchar("certificationCompany", { length: 50 }),
    estimatedValue: decimal("estimatedValue", { precision: 12, scale: 2 }),
    description: text("description").notNull(),
    status: mysqlEnum("status", listingStatuses).default("active").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    featured: boolean("featured").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerIdx: index("listings_owner_idx").on(table.ownerId),
    categoryIdx: index("listings_category_idx").on(table.category),
    conditionIdx: index("listings_condition_idx").on(table.condition),
    statusIdx: index("listings_status_idx").on(table.status),
  }),
);

export const listingPhotos = mysqlTable(
  "listingPhotos",
  {
    id: int("id").autoincrement().primaryKey(),
    listingId: int("listingId").notNull().references(() => listings.id),
    fileKey: varchar("fileKey", { length: 255 }).notNull(),
    imageUrl: text("imageUrl").notNull(),
    altText: varchar("altText", { length: 180 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    listingIdx: index("listingPhotos_listing_idx").on(table.listingId),
  }),
);

export const tradeProposals = mysqlTable(
  "tradeProposals",
  {
    id: int("id").autoincrement().primaryKey(),
    requesterId: int("requesterId").notNull().references(() => users.id),
    recipientId: int("recipientId").notNull().references(() => users.id),
    requestedListingId: int("requestedListingId").notNull().references(() => listings.id),
    note: text("note"),
    status: mysqlEnum("status", tradeStatuses).default("pending").notNull(),
    respondedAt: timestamp("respondedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    requesterIdx: index("tradeProposals_requester_idx").on(table.requesterId),
    recipientIdx: index("tradeProposals_recipient_idx").on(table.recipientId),
    requestedListingIdx: index("tradeProposals_requestedListing_idx").on(table.requestedListingId),
    statusIdx: index("tradeProposals_status_idx").on(table.status),
  }),
);

export const tradeProposalItems = mysqlTable(
  "tradeProposalItems",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => tradeProposals.id),
    offeredListingId: int("offeredListingId").notNull().references(() => listings.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    proposalIdx: index("tradeProposalItems_proposal_idx").on(table.proposalId),
    offeredListingIdx: index("tradeProposalItems_offeredListing_idx").on(table.offeredListingId),
    uniqueProposalItem: uniqueIndex("tradeProposalItems_unique_item").on(table.proposalId, table.offeredListingId),
  }),
);

export const tradeMessages = mysqlTable(
  "tradeMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => tradeProposals.id),
    senderId: int("senderId").notNull().references(() => users.id),
    message: text("message").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    proposalIdx: index("tradeMessages_proposal_idx").on(table.proposalId),
    senderIdx: index("tradeMessages_sender_idx").on(table.senderId),
  }),
);

export const tradeReviews = mysqlTable(
  "tradeReviews",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => tradeProposals.id),
    reviewerId: int("reviewerId").notNull().references(() => users.id),
    revieweeId: int("revieweeId").notNull().references(() => users.id),
    rating: int("rating").notNull(),
    review: text("review"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    proposalIdx: index("tradeReviews_proposal_idx").on(table.proposalId),
    reviewerIdx: index("tradeReviews_reviewer_idx").on(table.reviewerId),
    revieweeIdx: index("tradeReviews_reviewee_idx").on(table.revieweeId),
    uniqueReviewerPerProposal: uniqueIndex("tradeReviews_unique_reviewer_per_proposal").on(
      table.proposalId,
      table.reviewerId,
    ),
  }),
);

export const watchlistEntries = mysqlTable(
  "watchlistEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    listingId: int("listingId").notNull().references(() => listings.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("watchlistEntries_user_idx").on(table.userId),
    listingIdx: index("watchlistEntries_listing_idx").on(table.listingId),
    uniqueWatchlistItem: uniqueIndex("watchlistEntries_unique_user_listing").on(table.userId, table.listingId),
  }),
);

export const draftListings = mysqlTable(
  "draftListings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    title: varchar("title", { length: 160 }).notNull(),
    category: mysqlEnum("category", collectibleCategories).notNull(),
    grade: mysqlEnum("grade", gradeValues).default("ungraded").notNull(),
    graderCompany: varchar("graderCompany", { length: 100 }),
    certificationNumber: varchar("certificationNumber", { length: 100 }),
    estimatedValue: decimal("estimatedValue", { precision: 12, scale: 2 }),
    categoryFields: text("categoryFields"), // JSON string of category-specific fields
    additionalNotes: text("additionalNotes"),
    photos: text("photos"), // JSON string of photo data
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("draftListings_user_idx").on(table.userId),
    createdAtIdx: index("draftListings_createdAt_idx").on(table.createdAt),
  }),
);

export const passwordResetTokens = mysqlTable(
  "passwordResetTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).unique().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("passwordResetTokens_user_idx").on(table.userId),
    expiresAtIdx: index("passwordResetTokens_expiresAt_idx").on(table.expiresAt),
  })
);

export const emailVerificationOtps = mysqlTable(
  "emailVerificationOtps",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    otp: varchar("otp", { length: 6 }).notNull(),
    attempts: int("attempts").default(0).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    emailIdx: index("emailVerificationOtps_email_idx").on(table.email),
    expiresAtIdx: index("emailVerificationOtps_expiresAt_idx").on(table.expiresAt),
  })
);

export const phoneVerificationOtps = mysqlTable(
  "phoneVerificationOtps",
  {
    id: int("id").autoincrement().primaryKey(),
    phone: varchar("phone", { length: 20 }).notNull(),
    otp: varchar("otp", { length: 6 }).notNull(),
    attempts: int("attempts").default(0).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    phoneIdx: index("phoneVerificationOtps_phone_idx").on(table.phone),
    expiresAtIdx: index("phoneVerificationOtps_expiresAt_idx").on(table.expiresAt),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type TradeProposal = typeof tradeProposals.$inferSelect;
export type TradeProposalItem = typeof tradeProposalItems.$inferSelect;
export type TradeMessage = typeof tradeMessages.$inferSelect;
export type TradeReview = typeof tradeReviews.$inferSelect;
export type WatchlistEntry = typeof watchlistEntries.$inferSelect;
export type DraftListing = typeof draftListings.$inferSelect;

export const deletedAccounts = mysqlTable(
  "deletedAccounts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    email: varchar("email", { length: 320 }),
    displayName: varchar("displayName", { length: 255 }),
    firstName: varchar("firstName", { length: 100 }),
    lastName: varchar("lastName", { length: 100 }),
    deletedBy: int("deletedBy").notNull().references(() => users.id),
    reason: text("reason"),
    deletedAt: timestamp("deletedAt").defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index("deletedAccounts_userId_idx").on(table.userId),
    usernameIdx: index("deletedAccounts_username_idx").on(table.username),
    emailIdx: index("deletedAccounts_email_idx").on(table.email),
    deletedAtIdx: index("deletedAccounts_deletedAt_idx").on(table.deletedAt),
  })
);

export type DeletedAccount = typeof deletedAccounts.$inferSelect;


export const userReports = mysqlTable(
  "userReports",
  {
    id: int("id").autoincrement().primaryKey(),
    reportId: varchar("reportId", { length: 20 }).unique().notNull(), // e.g., "RPT-001", "RPT-002"
    reportedUserId: int("reportedUserId").notNull().references(() => users.id),
    reporterUserId: int("reporterUserId").notNull().references(() => users.id),
    reason: varchar("reason", { length: 100 }).notNull(), // e.g., "Fraud", "Harassment", "Inappropriate Content"
    description: text("description").notNull(),
    evidence: text("evidence"), // Optional: URL or description of evidence
    status: mysqlEnum("status", ["pending", "reviewed", "dismissed", "action_taken"]).default("pending").notNull(),
    adminNotes: text("adminNotes"), // Notes added by admin when reviewing
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
    reviewedBy: int("reviewedBy").references(() => users.id),
  },
  table => ({
    reportedUserIdIdx: index("userReports_reportedUserId_idx").on(table.reportedUserId),
    reporterUserIdIdx: index("userReports_reporterUserId_idx").on(table.reporterUserId),
    statusIdx: index("userReports_status_idx").on(table.status),
    createdAtIdx: index("userReports_createdAt_idx").on(table.createdAt),
  })
);

export type UserReport = typeof userReports.$inferSelect;
export type UserReportInsert = typeof userReports.$inferInsert;

export const ebayFeedbackHistory = mysqlTable(
  "ebayFeedbackHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    feedbackId: varchar("feedbackId", { length: 64 }).notNull(),
    rating: mysqlEnum("rating", ["positive", "neutral", "negative"]).notNull(),
    comment: text("comment"),
    from: varchar("from", { length: 64 }).notNull(),
    itemId: varchar("itemId", { length: 64 }),
    itemTitle: varchar("itemTitle", { length: 255 }),
    feedbackDate: timestamp("feedbackDate").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index("ebayFeedbackHistory_userId_idx").on(table.userId),
    feedbackIdIdx: index("ebayFeedbackHistory_feedbackId_idx").on(table.feedbackId),
    feedbackDateIdx: index("ebayFeedbackHistory_feedbackDate_idx").on(table.feedbackDate),
  })
);
export type EbayFeedbackHistory = typeof ebayFeedbackHistory.$inferSelect;
export type EbayFeedbackHistoryInsert = typeof ebayFeedbackHistory.$inferInsert;

export const lowFeedbackFlags = mysqlTable(
  "lowFeedbackFlags",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    feedbackScore: int("feedbackScore").notNull(),
    feedbackPercentage: decimal("feedbackPercentage", { precision: 5, scale: 2 }).notNull(),
    flaggedReason: text("flaggedReason"),
    status: mysqlEnum("status", ["pending", "reviewed", "dismissed", "action_taken"]).default("pending").notNull(),
    adminNotes: text("adminNotes"),
    flaggedAt: timestamp("flaggedAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
    reviewedBy: int("reviewedBy").references(() => users.id),
  },
  table => ({
    userIdIdx: index("lowFeedbackFlags_userId_idx").on(table.userId),
    statusIdx: index("lowFeedbackFlags_status_idx").on(table.status),
    flaggedAtIdx: index("lowFeedbackFlags_flaggedAt_idx").on(table.flaggedAt),
  })
);
export type LowFeedbackFlag = typeof lowFeedbackFlags.$inferSelect;
export type LowFeedbackFlagInsert = typeof lowFeedbackFlags.$inferInsert;
