import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, foreignKey, int, varchar, text, timestamp, mysqlEnum, decimal, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const deletedAccounts = mysqlTable("deletedAccounts", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	username: varchar({ length: 64 }).notNull(),
	email: varchar({ length: 320 }),
	displayName: varchar({ length: 255 }),
	firstName: varchar({ length: 100 }),
	lastName: varchar({ length: 100 }),
	deletedBy: int().notNull().references(() => users.id),
	reason: text(),
	deletedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("deletedAccounts_userId_idx").on(table.userId),
	index("deletedAccounts_username_idx").on(table.username),
	index("deletedAccounts_email_idx").on(table.email),
	index("deletedAccounts_deletedAt_idx").on(table.deletedAt),
]);

export const draftListings = mysqlTable("draftListings", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id),
	title: varchar({ length: 160 }).notNull(),
	category: mysqlEnum(['comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins']).notNull(),
	grade: varchar({ length: 50 }).default('ungraded').notNull(),
	graderCompany: varchar({ length: 100 }),
	certificationNumber: varchar({ length: 100 }),
	estimatedValue: decimal({ precision: 12, scale: 2 }),
	categoryFields: text(),
	additionalNotes: text(),
	photos: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("draftListings_user_idx").on(table.userId),
	index("draftListings_createdAt_idx").on(table.createdAt),
]);

export const ebayFeedbackHistory = mysqlTable("ebayFeedbackHistory", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id),
	feedbackId: varchar({ length: 64 }).notNull(),
	rating: mysqlEnum(['positive','neutral','negative']).notNull(),
	comment: text(),
	from: varchar({ length: 64 }).notNull(),
	itemId: varchar({ length: 64 }),
	itemTitle: varchar({ length: 255 }),
	feedbackDate: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("ebayFeedbackHistory_userId_idx").on(table.userId),
	index("ebayFeedbackHistory_feedbackId_idx").on(table.feedbackId),
	index("ebayFeedbackHistory_feedbackDate_idx").on(table.feedbackDate),
]);

export const emailVerificationOtps = mysqlTable("emailVerificationOtps", {
	id: int().autoincrement().notNull(),
	email: varchar({ length: 320 }).notNull(),
	otp: varchar({ length: 6 }).notNull(),
	attempts: int().default(0).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("emailVerificationOtps_email_idx").on(table.email),
	index("emailVerificationOtps_expiresAt_idx").on(table.expiresAt),
]);

export const favorites = mysqlTable("favorites", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id),
	listingId: int().notNull().references(() => listings.id),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("favorites_user_listing_unique").on(table.userId, table.listingId),
	index("favorites_user_idx").on(table.userId),
	index("favorites_listing_idx").on(table.listingId),
]);

export const forumPosts = mysqlTable("forumPosts", {
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("forumPosts_userId_idx").on(table.userId),
	index("forumPosts_category_idx").on(table.category),
	index("forumPosts_isPinned_idx").on(table.isPinned),
	index("forumPosts_createdAt_idx").on(table.createdAt),
]);

export const forumReplies = mysqlTable("forumReplies", {
	id: int().autoincrement().notNull(),
	postId: int().notNull().references(() => forumPosts.id, { onDelete: "cascade" } ),
	userId: int().notNull().references(() => users.id),
	content: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("forumReplies_postId_idx").on(table.postId),
	index("forumReplies_userId_idx").on(table.userId),
	index("forumReplies_createdAt_idx").on(table.createdAt),
]);

export const inquiryReplies = mysqlTable("inquiryReplies", {
	id: int().autoincrement().notNull(),
	inquiryId: int().notNull().references(() => itemInquiries.id),
	senderId: int().notNull().references(() => users.id),
	message: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	recipientId: int().notNull(),
	isRead: tinyint().default(0).notNull(),
},
(table) => [
	index("inquiryReplies_inquiry_idx").on(table.inquiryId),
	index("inquiryReplies_sender_idx").on(table.senderId),
]);

export const itemInquiries = mysqlTable("itemInquiries", {
	id: int().autoincrement().notNull(),
	senderId: int().notNull().references(() => users.id),
	recipientId: int().notNull().references(() => users.id),
	listingId: int().notNull().references(() => listings.id),
	subject: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	isRead: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	senderIsRead: tinyint().default(0).notNull(),
	recipientIsRead: tinyint().default(0).notNull(),
},
(table) => [
	index("itemInquiries_sender_idx").on(table.senderId),
	index("itemInquiries_recipient_idx").on(table.recipientId),
	index("itemInquiries_listing_idx").on(table.listingId),
	index("itemInquiries_recipient_unread_idx").on(table.recipientId, table.isRead),
]);

export const listingPhotos = mysqlTable("listingPhotos", {
	id: int().autoincrement().notNull(),
	listingId: int().notNull().references(() => listings.id),
	fileKey: varchar({ length: 255 }).notNull(),
	imageUrl: text().notNull(),
	altText: varchar({ length: 180 }),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("listingPhotos_listing_idx").on(table.listingId),
]);

export const listings = mysqlTable("listings", {
	id: int().autoincrement().notNull(),
	ownerId: int().notNull().references(() => users.id),
	title: varchar({ length: 160 }).notNull(),
	category: mysqlEnum(['comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins']).notNull(),
	condition: mysqlEnum(['mint','near_mint','excellent','very_good','good','fair','poor']).notNull(),
	grade: decimal({ precision: 5, scale: 2 }).default('0').notNull(),
	certificationCompany: varchar({ length: 50 }),
	estimatedValue: decimal({ precision: 12, scale: 2 }),
	description: text().notNull(),
	status: mysqlEnum(['active','traded','archived']).default('active').notNull(),
	isActive: tinyint().default(1).notNull(),
	featured: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	itemDetails: text(),
	viewCount: int().default(0).notNull(),
	itemType: varchar({ length: 50 }).notNull(),
	signatures: text(),
	certificationNumber: varchar({ length: 100 }),
},
(table) => [
	index("listings_owner_idx").on(table.ownerId),
	index("listings_category_idx").on(table.category),
	index("listings_condition_idx").on(table.condition),
	index("listings_status_idx").on(table.status),
	index("listings_itemType_idx").on(table.itemType),
]);

export const lowFeedbackFlags = mysqlTable("lowFeedbackFlags", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id),
	feedbackScore: int().notNull(),
	feedbackPercentage: decimal({ precision: 5, scale: 2 }).notNull(),
	flaggedReason: text(),
	status: mysqlEnum(['pending','reviewed','dismissed','action_taken']).default('pending').notNull(),
	adminNotes: text(),
	flaggedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewedBy: int().references(() => users.id),
},
(table) => [
	index("lowFeedbackFlags_userId_idx").on(table.userId),
	index("lowFeedbackFlags_status_idx").on(table.status),
	index("lowFeedbackFlags_flaggedAt_idx").on(table.flaggedAt),
]);

export const passwordResetTokens = mysqlTable("passwordResetTokens", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	token: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("passwordResetTokens_token_unique").on(table.token),
	index("passwordResetTokens_user_idx").on(table.userId),
	index("passwordResetTokens_expiresAt_idx").on(table.expiresAt),
]);

export const phoneVerificationOtps = mysqlTable("phoneVerificationOtps", {
	id: int().autoincrement().notNull(),
	phone: varchar({ length: 20 }).notNull(),
	otp: varchar({ length: 6 }).notNull(),
	attempts: int().default(0).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("phoneVerificationOtps_phone_idx").on(table.phone),
	index("phoneVerificationOtps_expiresAt_idx").on(table.expiresAt),
]);

export const referralRequests = mysqlTable("referralRequests", {
	id: int().autoincrement().notNull(),
	referrerId: int().notNull().references(() => users.id),
	referrerEmail: varchar({ length: 320 }).notNull(),
	referrerFirstName: varchar({ length: 255 }).notNull(),
	referrerLastName: varchar({ length: 255 }).notNull(),
	collectorName: varchar({ length: 255 }).notNull(),
	collectorEmail: varchar({ length: 320 }).notNull(),
	collectorFocus: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	status: mysqlEnum(['pending','reviewed','approved','rejected']).default('pending').notNull(),
	adminNotes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewedBy: int().references(() => users.id),
	emailSent: tinyint().default(0).notNull(),
	emailSentAt: timestamp({ mode: 'string' }),
	hasJoined: tinyint().default(0).notNull(),
	joinedAt: timestamp({ mode: 'string' }),
	joinedUserId: int().references(() => users.id),
	isMerchant: tinyint().default(0).notNull(),
},
(table) => [
	index("referralRequests_referrer_idx").on(table.referrerId),
	index("referralRequests_status_idx").on(table.status),
	index("referralRequests_createdAt_idx").on(table.createdAt),
	index("referralRequests_emailSent_idx").on(table.emailSent),
	index("referralRequests_hasJoined_idx").on(table.hasJoined),
]);

export const tradeMessages = mysqlTable("tradeMessages", {
	id: int().autoincrement().notNull(),
	proposalId: int().notNull().references(() => tradeProposals.id),
	senderId: int().notNull().references(() => users.id),
	message: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("tradeMessages_proposal_idx").on(table.proposalId),
	index("tradeMessages_sender_idx").on(table.senderId),
]);

export const tradeProposalItems = mysqlTable("tradeProposalItems", {
	id: int().autoincrement().notNull(),
	proposalId: int().notNull().references(() => tradeProposals.id),
	offeredListingId: int().notNull().references(() => listings.id),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("tradeProposalItems_unique_item").on(table.proposalId, table.offeredListingId),
	index("tradeProposalItems_proposal_idx").on(table.proposalId),
	index("tradeProposalItems_offeredListing_idx").on(table.offeredListingId),
]);

export const tradeProposals = mysqlTable("tradeProposals", {
	id: int().autoincrement().notNull(),
	requesterId: int().notNull().references(() => users.id),
	recipientId: int().notNull().references(() => users.id),
	requestedListingId: int().notNull().references(() => listings.id),
	note: text(),
	status: mysqlEnum(['pending','negotiating','accepted','shipping','shipped','declined','completed','cancelled']).default('pending').notNull(),
	lastProposedBy: int().references(() => users.id), // userId of whoever sent the most recent proposal
	respondedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	referenceNumber: varchar({ length: 20 }), // e.g. TR-00001
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("tradeProposals_requester_idx").on(table.requesterId),
	index("tradeProposals_recipient_idx").on(table.recipientId),
	index("tradeProposals_requestedListing_idx").on(table.requestedListingId),
	index("tradeProposals_status_idx").on(table.status),
]);

export const tradeActivityLog = mysqlTable("tradeActivityLog", {
	id: int().autoincrement().notNull(),
	proposalId: int().notNull().references(() => tradeProposals.id),
	actorId: int().notNull().references(() => users.id),
	actorName: varchar({ length: 255 }).notNull(),
	eventType: mysqlEnum(['trade_created','partner_joined','item_added','item_removed','cash_added','cash_removed','proposal_sent','proposal_accepted','proposal_declined','trade_cancelled','tracking_submitted','items_received','trade_completed']).notNull(),
	details: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("tradeActivityLog_proposal_idx").on(table.proposalId),
	index("tradeActivityLog_actor_idx").on(table.actorId),
	index("tradeActivityLog_createdAt_idx").on(table.createdAt),
]);

export const tradeReviews = mysqlTable("tradeReviews", {
	id: int().autoincrement().notNull(),
	proposalId: int().notNull().references(() => tradeProposals.id),
	reviewerId: int().notNull().references(() => users.id),
	revieweeId: int().notNull().references(() => users.id),
	rating: int().notNull(),
	review: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("tradeReviews_unique_reviewer_per_proposal").on(table.proposalId, table.reviewerId),
	index("tradeReviews_proposal_idx").on(table.proposalId),
	index("tradeReviews_reviewer_idx").on(table.reviewerId),
	index("tradeReviews_reviewee_idx").on(table.revieweeId),
]);

export const userProfiles = mysqlTable("userProfiles", {
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("userProfiles_userId_unique").on(table.userId),
]);

export const userReports = mysqlTable("userReports", {
	id: int().autoincrement().notNull(),
	reportId: varchar({ length: 20 }).notNull(),
	reportedUserId: int().notNull().references(() => users.id),
	reporterUserId: int().notNull().references(() => users.id),
	reason: varchar({ length: 100 }).notNull(),
	description: text().notNull(),
	evidence: text(),
	status: mysqlEnum(['pending','reviewed','dismissed','action_taken']).default('pending').notNull(),
	adminNotes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewedBy: int().references(() => users.id),
},
(table) => [
	index("userReports_reportId_unique").on(table.reportId),
	index("userReports_reportedUserId_idx").on(table.reportedUserId),
	index("userReports_reporterUserId_idx").on(table.reporterUserId),
	index("userReports_status_idx").on(table.status),
	index("userReports_createdAt_idx").on(table.createdAt),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }),
	username: varchar({ length: 64 }),
	passwordHash: varchar({ length: 255 }),
	name: text(),
	email: varchar({ length: 320 }),
	displayName: varchar({ length: 255 }),
	avatarUrl: text(),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	securityQuestion: varchar({ length: 255 }),
	securityAnswerHash: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	lastActivityAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	ebayUsername: varchar({ length: 64 }),
	ebayUserId: varchar({ length: 64 }),
	ebayFeedbackScore: int(),
	ebayFeedbackPercentage: decimal({ precision: 5, scale: 2 }),
	ebayMemberSince: timestamp({ mode: 'string' }),
	ebayConnectedAt: timestamp({ mode: 'string' }),
		ebayAccessToken: text(),
		ebayRefreshToken: text(),
		ebayTokenExpiresAt: timestamp({ mode: 'string' }),
		isSuspended: tinyint().default(0).notNull(),
		suspendedAt: timestamp({ mode: 'string' }),
	},
(table) => [
	index("users_openId_unique").on(table.openId),
	index("users_username_unique").on(table.username),
]);

export const watchlistEntries = mysqlTable("watchlistEntries", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id),
	listingId: int().notNull().references(() => listings.id),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("watchlistEntries_unique_user_listing").on(table.userId, table.listingId),
	index("watchlistEntries_user_idx").on(table.userId),
	index("watchlistEntries_listing_idx").on(table.listingId),
]);

export const conventionCategories = mysqlTable("conventionCategories", {
	id: int().autoincrement().notNull(),
	conventionId: int().notNull(),
	category: mysqlEnum(['comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins','all']).notNull(),
},
(table) => [
	index("cc_convention_idx").on(table.conventionId),
	index("cc_category_idx").on(table.category),
]);

export const conventions = mysqlTable("conventions", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: mysqlEnum(['comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins','all']).notNull().default('all'),
	startDate: varchar({ length: 20 }).notNull(),
	endDate: varchar({ length: 20 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	country: varchar({ length: 100 }).notNull().default('United States'),
	venue: varchar({ length: 255 }),
	website: varchar({ length: 500 }),
	admission: varchar({ length: 100 }),
	description: text(),
	source: varchar({ length: 100 }).default('user'),
	status: mysqlEnum(['pending','approved','rejected']).notNull().default('pending'),
	submittedBy: int().references(() => users.id),
	approvedBy: int().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("conventions_category_idx").on(table.category),
	index("conventions_startDate_idx").on(table.startDate),
	index("conventions_status_idx").on(table.status),
	index("conventions_country_idx").on(table.country),
]);

export const userFollows = mysqlTable("userFollows", {
	id: int().autoincrement().notNull(),
	followerId: int().notNull().references(() => users.id),
	followingId: int().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("userFollows_follower_idx").on(table.followerId),
	index("userFollows_following_idx").on(table.followingId),
	index("userFollows_unique").on(table.followerId, table.followingId),
]);

// ---------------------------------------------------------------------------
// Inferred row types.
// IMPORTANT: these exports are consumed across the server (db.ts, customAuth,
// context, sdk). They were lost once before when this file was regenerated by
// drizzle-kit — if you ever regenerate the schema, RE-ADD this block.
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
