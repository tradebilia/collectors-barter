ALTER TABLE `favorites` DROP INDEX `favorites_userId_listingId_unique`;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` DROP INDEX `passwordResetTokens_token_unique`;--> statement-breakpoint
ALTER TABLE `tradeProposalItems` DROP INDEX `tradeProposalItems_unique_item`;--> statement-breakpoint
ALTER TABLE `tradeReviews` DROP INDEX `tradeReviews_unique_reviewer_per_proposal`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP INDEX `userProfiles_userId_unique`;--> statement-breakpoint
ALTER TABLE `userReports` DROP INDEX `userReports_reportId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_username_unique`;--> statement-breakpoint
ALTER TABLE `watchlistEntries` DROP INDEX `watchlistEntries_unique_user_listing`;--> statement-breakpoint
ALTER TABLE `inquiryReplies` DROP FOREIGN KEY `inquiryReplies_recipientId_users_id_fk`;
--> statement-breakpoint
DROP INDEX `favorites_userId_idx` ON `favorites`;--> statement-breakpoint
DROP INDEX `favorites_listingId_idx` ON `favorites`;--> statement-breakpoint
DROP INDEX `inquiryReplies_recipient_idx` ON `inquiryReplies`;--> statement-breakpoint
DROP INDEX `inquiryReplies_recipient_unread_idx` ON `inquiryReplies`;--> statement-breakpoint
DROP INDEX `listings_fulltext_idx` ON `listings`;--> statement-breakpoint
ALTER TABLE `deletedAccounts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `draftListings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `ebayFeedbackHistory` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `emailVerificationOtps` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `favorites` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `forumPosts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `forumReplies` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `inquiryReplies` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `itemInquiries` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listingPhotos` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `lowFeedbackFlags` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `phoneVerificationOtps` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `referralRequests` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `tradeMessages` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `tradeProposalItems` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `tradeProposals` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `tradeReviews` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `userReports` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `watchlistEntries` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `deletedAccounts` MODIFY COLUMN `deletedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `draftListings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `ebayFeedbackHistory` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `emailVerificationOtps` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `favorites` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `forumPosts` MODIFY COLUMN `isPinned` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `forumPosts` MODIFY COLUMN `isPinned` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `forumPosts` MODIFY COLUMN `isLocked` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `forumPosts` MODIFY COLUMN `isLocked` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `forumPosts` MODIFY COLUMN `isSolved` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `forumPosts` MODIFY COLUMN `isSolved` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `forumPosts` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `forumReplies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `inquiryReplies` MODIFY COLUMN `isRead` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiryReplies` MODIFY COLUMN `isRead` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inquiryReplies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `itemInquiries` MODIFY COLUMN `isRead` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `itemInquiries` MODIFY COLUMN `isRead` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `itemInquiries` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listingPhotos` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `condition` enum('mint','near_mint','excellent','very_good','good','fair','poor') NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `grade` enum('ungraded','1','1.5','2','2.5','3','3.5','4','4.5','5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10') NOT NULL DEFAULT 'ungraded';--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `featured` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `featured` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `lowFeedbackFlags` MODIFY COLUMN `flaggedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `passwordResetTokens` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `phoneVerificationOtps` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `referralRequests` MODIFY COLUMN `isMerchant` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `referralRequests` MODIFY COLUMN `isMerchant` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `referralRequests` MODIFY COLUMN `emailSent` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `referralRequests` MODIFY COLUMN `emailSent` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `referralRequests` MODIFY COLUMN `hasJoined` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `referralRequests` MODIFY COLUMN `hasJoined` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `referralRequests` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tradeMessages` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tradeProposalItems` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tradeProposals` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tradeReviews` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `acceptedTerms` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `acceptedTerms` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `isMerchant` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `isMerchant` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `showProfile` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `hideInventoryValue` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `hideInventoryValue` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `receiveContactRequests` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `emailVerified` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `emailVerified` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `phoneVerified` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `phoneVerified` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `userReports` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastActivityAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `watchlistEntries` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `itemInquiries` ADD `senderIsRead` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `itemInquiries` ADD `recipientIsRead` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `favorites_user_listing_unique` ON `favorites` (`userId`,`listingId`);--> statement-breakpoint
CREATE INDEX `favorites_user_idx` ON `favorites` (`userId`);--> statement-breakpoint
CREATE INDEX `favorites_listing_idx` ON `favorites` (`listingId`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_token_unique` ON `passwordResetTokens` (`token`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_unique_item` ON `tradeProposalItems` (`proposalId`,`offeredListingId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_unique_reviewer_per_proposal` ON `tradeReviews` (`proposalId`,`reviewerId`);--> statement-breakpoint
CREATE INDEX `userProfiles_userId_unique` ON `userProfiles` (`userId`);--> statement-breakpoint
CREATE INDEX `userReports_reportId_unique` ON `userReports` (`reportId`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_unique_user_listing` ON `watchlistEntries` (`userId`,`listingId`);