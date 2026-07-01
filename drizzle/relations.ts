import { relations } from "drizzle-orm/relations";
import { users, deletedAccounts, draftListings, ebayFeedbackHistory, favorites, listings, forumPosts, forumReplies, itemInquiries, inquiryReplies, listingPhotos, lowFeedbackFlags, passwordResetTokens, referralRequests, tradeProposals, tradeMessages, tradeProposalItems, tradeReviews, userProfiles, userReports, watchlistEntries } from "./schema";

export const deletedAccountsRelations = relations(deletedAccounts, ({one}) => ({
	user: one(users, {
		fields: [deletedAccounts.deletedBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	deletedAccounts: many(deletedAccounts),
	draftListings: many(draftListings),
	ebayFeedbackHistories: many(ebayFeedbackHistory),
	favorites: many(favorites),
	forumPosts: many(forumPosts),
	forumReplies: many(forumReplies),
	inquiryReplies: many(inquiryReplies),
	itemInquiries_senderId: many(itemInquiries, {
		relationName: "itemInquiries_senderId_users_id"
	}),
	itemInquiries_recipientId: many(itemInquiries, {
		relationName: "itemInquiries_recipientId_users_id"
	}),
	listings: many(listings),
	lowFeedbackFlags_userId: many(lowFeedbackFlags, {
		relationName: "lowFeedbackFlags_userId_users_id"
	}),
	lowFeedbackFlags_reviewedBy: many(lowFeedbackFlags, {
		relationName: "lowFeedbackFlags_reviewedBy_users_id"
	}),
	passwordResetTokens: many(passwordResetTokens),
	referralRequests_referrerId: many(referralRequests, {
		relationName: "referralRequests_referrerId_users_id"
	}),
	referralRequests_reviewedBy: many(referralRequests, {
		relationName: "referralRequests_reviewedBy_users_id"
	}),
	referralRequests_joinedUserId: many(referralRequests, {
		relationName: "referralRequests_joinedUserId_users_id"
	}),
	tradeMessages: many(tradeMessages),
	tradeProposals_requesterId: many(tradeProposals, {
		relationName: "tradeProposals_requesterId_users_id"
	}),
	tradeProposals_recipientId: many(tradeProposals, {
		relationName: "tradeProposals_recipientId_users_id"
	}),
	tradeReviews_reviewerId: many(tradeReviews, {
		relationName: "tradeReviews_reviewerId_users_id"
	}),
	tradeReviews_revieweeId: many(tradeReviews, {
		relationName: "tradeReviews_revieweeId_users_id"
	}),
	userProfiles: many(userProfiles),
	userReports_reportedUserId: many(userReports, {
		relationName: "userReports_reportedUserId_users_id"
	}),
	userReports_reporterUserId: many(userReports, {
		relationName: "userReports_reporterUserId_users_id"
	}),
	userReports_reviewedBy: many(userReports, {
		relationName: "userReports_reviewedBy_users_id"
	}),
	watchlistEntries: many(watchlistEntries),
}));

export const draftListingsRelations = relations(draftListings, ({one}) => ({
	user: one(users, {
		fields: [draftListings.userId],
		references: [users.id]
	}),
}));

export const ebayFeedbackHistoryRelations = relations(ebayFeedbackHistory, ({one}) => ({
	user: one(users, {
		fields: [ebayFeedbackHistory.userId],
		references: [users.id]
	}),
}));

export const favoritesRelations = relations(favorites, ({one}) => ({
	user: one(users, {
		fields: [favorites.userId],
		references: [users.id]
	}),
	listing: one(listings, {
		fields: [favorites.listingId],
		references: [listings.id]
	}),
}));

export const listingsRelations = relations(listings, ({one, many}) => ({
	favorites: many(favorites),
	itemInquiries: many(itemInquiries),
	listingPhotos: many(listingPhotos),
	user: one(users, {
		fields: [listings.ownerId],
		references: [users.id]
	}),
	tradeProposalItems: many(tradeProposalItems),
	tradeProposals: many(tradeProposals),
	watchlistEntries: many(watchlistEntries),
}));

export const forumPostsRelations = relations(forumPosts, ({one, many}) => ({
	user: one(users, {
		fields: [forumPosts.userId],
		references: [users.id]
	}),
	forumReplies: many(forumReplies),
}));

export const forumRepliesRelations = relations(forumReplies, ({one}) => ({
	forumPost: one(forumPosts, {
		fields: [forumReplies.postId],
		references: [forumPosts.id]
	}),
	user: one(users, {
		fields: [forumReplies.userId],
		references: [users.id]
	}),
}));

export const inquiryRepliesRelations = relations(inquiryReplies, ({one}) => ({
	itemInquiry: one(itemInquiries, {
		fields: [inquiryReplies.inquiryId],
		references: [itemInquiries.id]
	}),
	user: one(users, {
		fields: [inquiryReplies.senderId],
		references: [users.id]
	}),
}));

export const itemInquiriesRelations = relations(itemInquiries, ({one, many}) => ({
	inquiryReplies: many(inquiryReplies),
	user_senderId: one(users, {
		fields: [itemInquiries.senderId],
		references: [users.id],
		relationName: "itemInquiries_senderId_users_id"
	}),
	user_recipientId: one(users, {
		fields: [itemInquiries.recipientId],
		references: [users.id],
		relationName: "itemInquiries_recipientId_users_id"
	}),
	listing: one(listings, {
		fields: [itemInquiries.listingId],
		references: [listings.id]
	}),
}));

export const listingPhotosRelations = relations(listingPhotos, ({one}) => ({
	listing: one(listings, {
		fields: [listingPhotos.listingId],
		references: [listings.id]
	}),
}));

export const lowFeedbackFlagsRelations = relations(lowFeedbackFlags, ({one}) => ({
	user_userId: one(users, {
		fields: [lowFeedbackFlags.userId],
		references: [users.id],
		relationName: "lowFeedbackFlags_userId_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [lowFeedbackFlags.reviewedBy],
		references: [users.id],
		relationName: "lowFeedbackFlags_reviewedBy_users_id"
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const referralRequestsRelations = relations(referralRequests, ({one}) => ({
	user_referrerId: one(users, {
		fields: [referralRequests.referrerId],
		references: [users.id],
		relationName: "referralRequests_referrerId_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [referralRequests.reviewedBy],
		references: [users.id],
		relationName: "referralRequests_reviewedBy_users_id"
	}),
	user_joinedUserId: one(users, {
		fields: [referralRequests.joinedUserId],
		references: [users.id],
		relationName: "referralRequests_joinedUserId_users_id"
	}),
}));

export const tradeMessagesRelations = relations(tradeMessages, ({one}) => ({
	tradeProposal: one(tradeProposals, {
		fields: [tradeMessages.proposalId],
		references: [tradeProposals.id]
	}),
	user: one(users, {
		fields: [tradeMessages.senderId],
		references: [users.id]
	}),
}));

export const tradeProposalsRelations = relations(tradeProposals, ({one, many}) => ({
	tradeMessages: many(tradeMessages),
	tradeProposalItems: many(tradeProposalItems),
	user_requesterId: one(users, {
		fields: [tradeProposals.requesterId],
		references: [users.id],
		relationName: "tradeProposals_requesterId_users_id"
	}),
	user_recipientId: one(users, {
		fields: [tradeProposals.recipientId],
		references: [users.id],
		relationName: "tradeProposals_recipientId_users_id"
	}),
	listing: one(listings, {
		fields: [tradeProposals.requestedListingId],
		references: [listings.id]
	}),
	tradeReviews: many(tradeReviews),
}));

export const tradeProposalItemsRelations = relations(tradeProposalItems, ({one}) => ({
	tradeProposal: one(tradeProposals, {
		fields: [tradeProposalItems.proposalId],
		references: [tradeProposals.id]
	}),
	listing: one(listings, {
		fields: [tradeProposalItems.offeredListingId],
		references: [listings.id]
	}),
}));

export const tradeReviewsRelations = relations(tradeReviews, ({one}) => ({
	tradeProposal: one(tradeProposals, {
		fields: [tradeReviews.proposalId],
		references: [tradeProposals.id]
	}),
	user_reviewerId: one(users, {
		fields: [tradeReviews.reviewerId],
		references: [users.id],
		relationName: "tradeReviews_reviewerId_users_id"
	}),
	user_revieweeId: one(users, {
		fields: [tradeReviews.revieweeId],
		references: [users.id],
		relationName: "tradeReviews_revieweeId_users_id"
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
}));

export const userReportsRelations = relations(userReports, ({one}) => ({
	user_reportedUserId: one(users, {
		fields: [userReports.reportedUserId],
		references: [users.id],
		relationName: "userReports_reportedUserId_users_id"
	}),
	user_reporterUserId: one(users, {
		fields: [userReports.reporterUserId],
		references: [users.id],
		relationName: "userReports_reporterUserId_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [userReports.reviewedBy],
		references: [users.id],
		relationName: "userReports_reviewedBy_users_id"
	}),
}));

export const watchlistEntriesRelations = relations(watchlistEntries, ({one}) => ({
	user: one(users, {
		fields: [watchlistEntries.userId],
		references: [users.id]
	}),
	listing: one(listings, {
		fields: [watchlistEntries.listingId],
		references: [listings.id]
	}),
}));