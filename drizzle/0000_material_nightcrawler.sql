CREATE TABLE `deletedAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`email` varchar(320),
	`displayName` varchar(255),
	`firstName` varchar(100),
	`lastName` varchar(100),
	`deletedBy` int NOT NULL,
	`reason` text,
	`deletedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `draftListings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins') NOT NULL,
	`grade` varchar(50) NOT NULL DEFAULT 'ungraded',
	`graderCompany` varchar(100),
	`certificationNumber` varchar(100),
	`estimatedValue` decimal(12,2),
	`categoryFields` text,
	`additionalNotes` text,
	`photos` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ebayFeedbackHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`feedbackId` varchar(64) NOT NULL,
	`rating` enum('positive','neutral','negative') NOT NULL,
	`comment` text,
	`from` varchar(64) NOT NULL,
	`itemId` varchar(64),
	`itemTitle` varchar(255),
	`feedbackDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `emailVerificationOtps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`otp` varchar(6) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`listingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `forumPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isPinned` tinyint NOT NULL DEFAULT 0,
	`isLocked` tinyint NOT NULL DEFAULT 0,
	`isSolved` tinyint NOT NULL DEFAULT 0,
	`viewCount` int NOT NULL DEFAULT 0,
	`replyCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `forumReplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `inquiryReplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`recipientId` int NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `itemInquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`listingId` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`senderIsRead` tinyint NOT NULL DEFAULT 0,
	`recipientIsRead` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `listingPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`imageUrl` text NOT NULL,
	`altText` varchar(180),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins') NOT NULL,
	`condition` enum('mint','near_mint','excellent','very_good','good','fair','poor') NOT NULL,
	`grade` decimal(5,2) NOT NULL DEFAULT '0',
	`certificationCompany` varchar(50),
	`estimatedValue` decimal(12,2),
	`description` text NOT NULL,
	`status` enum('active','traded','archived') NOT NULL DEFAULT 'active',
	`isActive` tinyint NOT NULL DEFAULT 1,
	`featured` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`itemDetails` text,
	`viewCount` int NOT NULL DEFAULT 0,
	`itemType` varchar(50) NOT NULL,
	`signatures` text
);
--> statement-breakpoint
CREATE TABLE `lowFeedbackFlags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`feedbackScore` int NOT NULL,
	`feedbackPercentage` decimal(5,2) NOT NULL,
	`flaggedReason` text,
	`status` enum('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`flaggedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`reviewedAt` timestamp,
	`reviewedBy` int
);
--> statement-breakpoint
CREATE TABLE `passwordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `phoneVerificationOtps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`otp` varchar(6) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `referralRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referrerEmail` varchar(320) NOT NULL,
	`referrerFirstName` varchar(255) NOT NULL,
	`referrerLastName` varchar(255) NOT NULL,
	`collectorName` varchar(255) NOT NULL,
	`collectorEmail` varchar(320) NOT NULL,
	`collectorFocus` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`status` enum('pending','reviewed','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`emailSent` tinyint NOT NULL DEFAULT 0,
	`emailSentAt` timestamp,
	`hasJoined` tinyint NOT NULL DEFAULT 0,
	`joinedAt` timestamp,
	`joinedUserId` int,
	`isMerchant` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `tradeMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeProposalItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`offeredListingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeProposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`recipientId` int NOT NULL,
	`requestedListingId` int NOT NULL,
	`note` text,
	`status` enum('pending','accepted','declined','completed','cancelled') NOT NULL DEFAULT 'pending',
	`respondedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tradeReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`revieweeId` int NOT NULL,
	`rating` int NOT NULL,
	`review` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`avatarUrl` text,
	`avatarKey` varchar(255),
	`bio` text,
	`contactFullName` varchar(160),
	`contactEmail` varchar(320),
	`contactPhone` varchar(40),
	`contactAddress` text,
	`contactTown` varchar(100),
	`contactState` varchar(100),
	`contactZipCode` varchar(20),
	`contactCountry` varchar(100),
	`acceptedTerms` tinyint NOT NULL DEFAULT 0,
	`isMerchant` tinyint NOT NULL DEFAULT 0,
	`securityQuestion` varchar(255),
	`securityAnswer` varchar(255),
	`preferredCategories` text,
	`notificationPreferences` text,
	`connectedAccounts` text,
	`showProfile` tinyint NOT NULL DEFAULT 1,
	`hideInventoryValue` tinyint NOT NULL DEFAULT 0,
	`receiveContactRequests` tinyint NOT NULL DEFAULT 1,
	`emailVerified` tinyint NOT NULL DEFAULT 0,
	`phoneVerified` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `userReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` varchar(20) NOT NULL,
	`reportedUserId` int NOT NULL,
	`reporterUserId` int NOT NULL,
	`reason` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`evidence` text,
	`status` enum('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`reviewedAt` timestamp,
	`reviewedBy` int
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64),
	`username` varchar(64),
	`passwordHash` varchar(255),
	`name` text,
	`email` varchar(320),
	`displayName` varchar(255),
	`avatarUrl` text,
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`securityQuestion` varchar(255),
	`securityAnswerHash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`lastActivityAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`ebayUsername` varchar(64),
	`ebayUserId` varchar(64),
	`ebayFeedbackScore` int,
	`ebayFeedbackPercentage` decimal(5,2),
	`ebayMemberSince` timestamp,
	`ebayConnectedAt` timestamp,
	`ebayAccessToken` text,
	`ebayRefreshToken` text,
	`ebayTokenExpiresAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `watchlistEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`listingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `deletedAccounts` ADD CONSTRAINT `deletedAccounts_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `draftListings` ADD CONSTRAINT `draftListings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ebayFeedbackHistory` ADD CONSTRAINT `ebayFeedbackHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumPosts` ADD CONSTRAINT `forumPosts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReplies` ADD CONSTRAINT `forumReplies_postId_forumPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `forumPosts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReplies` ADD CONSTRAINT `forumReplies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiryReplies` ADD CONSTRAINT `inquiryReplies_inquiryId_itemInquiries_id_fk` FOREIGN KEY (`inquiryId`) REFERENCES `itemInquiries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiryReplies` ADD CONSTRAINT `inquiryReplies_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itemInquiries` ADD CONSTRAINT `itemInquiries_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itemInquiries` ADD CONSTRAINT `itemInquiries_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itemInquiries` ADD CONSTRAINT `itemInquiries_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listingPhotos` ADD CONSTRAINT `listingPhotos_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listings` ADD CONSTRAINT `listings_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lowFeedbackFlags` ADD CONSTRAINT `lowFeedbackFlags_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lowFeedbackFlags` ADD CONSTRAINT `lowFeedbackFlags_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` ADD CONSTRAINT `passwordResetTokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_joinedUserId_users_id_fk` FOREIGN KEY (`joinedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeMessages` ADD CONSTRAINT `tradeMessages_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeMessages` ADD CONSTRAINT `tradeMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposalItems` ADD CONSTRAINT `tradeProposalItems_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposalItems` ADD CONSTRAINT `tradeProposalItems_offeredListingId_listings_id_fk` FOREIGN KEY (`offeredListingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_requestedListingId_listings_id_fk` FOREIGN KEY (`requestedListingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_reviewerId_users_id_fk` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_revieweeId_users_id_fk` FOREIGN KEY (`revieweeId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reportedUserId_users_id_fk` FOREIGN KEY (`reportedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlistEntries` ADD CONSTRAINT `watchlistEntries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlistEntries` ADD CONSTRAINT `watchlistEntries_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `deletedAccounts_userId_idx` ON `deletedAccounts` (`userId`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_username_idx` ON `deletedAccounts` (`username`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_email_idx` ON `deletedAccounts` (`email`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_deletedAt_idx` ON `deletedAccounts` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `draftListings_user_idx` ON `draftListings` (`userId`);--> statement-breakpoint
CREATE INDEX `draftListings_createdAt_idx` ON `draftListings` (`createdAt`);--> statement-breakpoint
CREATE INDEX `ebayFeedbackHistory_userId_idx` ON `ebayFeedbackHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `ebayFeedbackHistory_feedbackId_idx` ON `ebayFeedbackHistory` (`feedbackId`);--> statement-breakpoint
CREATE INDEX `ebayFeedbackHistory_feedbackDate_idx` ON `ebayFeedbackHistory` (`feedbackDate`);--> statement-breakpoint
CREATE INDEX `emailVerificationOtps_email_idx` ON `emailVerificationOtps` (`email`);--> statement-breakpoint
CREATE INDEX `emailVerificationOtps_expiresAt_idx` ON `emailVerificationOtps` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `favorites_user_listing_unique` ON `favorites` (`userId`,`listingId`);--> statement-breakpoint
CREATE INDEX `favorites_user_idx` ON `favorites` (`userId`);--> statement-breakpoint
CREATE INDEX `favorites_listing_idx` ON `favorites` (`listingId`);--> statement-breakpoint
CREATE INDEX `forumPosts_userId_idx` ON `forumPosts` (`userId`);--> statement-breakpoint
CREATE INDEX `forumPosts_category_idx` ON `forumPosts` (`category`);--> statement-breakpoint
CREATE INDEX `forumPosts_isPinned_idx` ON `forumPosts` (`isPinned`);--> statement-breakpoint
CREATE INDEX `forumPosts_createdAt_idx` ON `forumPosts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `forumReplies_postId_idx` ON `forumReplies` (`postId`);--> statement-breakpoint
CREATE INDEX `forumReplies_userId_idx` ON `forumReplies` (`userId`);--> statement-breakpoint
CREATE INDEX `forumReplies_createdAt_idx` ON `forumReplies` (`createdAt`);--> statement-breakpoint
CREATE INDEX `inquiryReplies_inquiry_idx` ON `inquiryReplies` (`inquiryId`);--> statement-breakpoint
CREATE INDEX `inquiryReplies_sender_idx` ON `inquiryReplies` (`senderId`);--> statement-breakpoint
CREATE INDEX `itemInquiries_sender_idx` ON `itemInquiries` (`senderId`);--> statement-breakpoint
CREATE INDEX `itemInquiries_recipient_idx` ON `itemInquiries` (`recipientId`);--> statement-breakpoint
CREATE INDEX `itemInquiries_listing_idx` ON `itemInquiries` (`listingId`);--> statement-breakpoint
CREATE INDEX `itemInquiries_recipient_unread_idx` ON `itemInquiries` (`recipientId`,`isRead`);--> statement-breakpoint
CREATE INDEX `listingPhotos_listing_idx` ON `listingPhotos` (`listingId`);--> statement-breakpoint
CREATE INDEX `listings_owner_idx` ON `listings` (`ownerId`);--> statement-breakpoint
CREATE INDEX `listings_category_idx` ON `listings` (`category`);--> statement-breakpoint
CREATE INDEX `listings_condition_idx` ON `listings` (`condition`);--> statement-breakpoint
CREATE INDEX `listings_status_idx` ON `listings` (`status`);--> statement-breakpoint
CREATE INDEX `listings_itemType_idx` ON `listings` (`itemType`);--> statement-breakpoint
CREATE INDEX `lowFeedbackFlags_userId_idx` ON `lowFeedbackFlags` (`userId`);--> statement-breakpoint
CREATE INDEX `lowFeedbackFlags_status_idx` ON `lowFeedbackFlags` (`status`);--> statement-breakpoint
CREATE INDEX `lowFeedbackFlags_flaggedAt_idx` ON `lowFeedbackFlags` (`flaggedAt`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_token_unique` ON `passwordResetTokens` (`token`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_user_idx` ON `passwordResetTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_expiresAt_idx` ON `passwordResetTokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `phoneVerificationOtps_phone_idx` ON `phoneVerificationOtps` (`phone`);--> statement-breakpoint
CREATE INDEX `phoneVerificationOtps_expiresAt_idx` ON `phoneVerificationOtps` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `referralRequests_referrer_idx` ON `referralRequests` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referralRequests_status_idx` ON `referralRequests` (`status`);--> statement-breakpoint
CREATE INDEX `referralRequests_createdAt_idx` ON `referralRequests` (`createdAt`);--> statement-breakpoint
CREATE INDEX `referralRequests_emailSent_idx` ON `referralRequests` (`emailSent`);--> statement-breakpoint
CREATE INDEX `referralRequests_hasJoined_idx` ON `referralRequests` (`hasJoined`);--> statement-breakpoint
CREATE INDEX `tradeMessages_proposal_idx` ON `tradeMessages` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeMessages_sender_idx` ON `tradeMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_unique_item` ON `tradeProposalItems` (`proposalId`,`offeredListingId`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_proposal_idx` ON `tradeProposalItems` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_offeredListing_idx` ON `tradeProposalItems` (`offeredListingId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_requester_idx` ON `tradeProposals` (`requesterId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_recipient_idx` ON `tradeProposals` (`recipientId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_requestedListing_idx` ON `tradeProposals` (`requestedListingId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_status_idx` ON `tradeProposals` (`status`);--> statement-breakpoint
CREATE INDEX `tradeReviews_unique_reviewer_per_proposal` ON `tradeReviews` (`proposalId`,`reviewerId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_proposal_idx` ON `tradeReviews` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_reviewer_idx` ON `tradeReviews` (`reviewerId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_reviewee_idx` ON `tradeReviews` (`revieweeId`);--> statement-breakpoint
CREATE INDEX `userProfiles_userId_unique` ON `userProfiles` (`userId`);--> statement-breakpoint
CREATE INDEX `userReports_reportId_unique` ON `userReports` (`reportId`);--> statement-breakpoint
CREATE INDEX `userReports_reportedUserId_idx` ON `userReports` (`reportedUserId`);--> statement-breakpoint
CREATE INDEX `userReports_reporterUserId_idx` ON `userReports` (`reporterUserId`);--> statement-breakpoint
CREATE INDEX `userReports_status_idx` ON `userReports` (`status`);--> statement-breakpoint
CREATE INDEX `userReports_createdAt_idx` ON `userReports` (`createdAt`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_unique_user_listing` ON `watchlistEntries` (`userId`,`listingId`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_user_idx` ON `watchlistEntries` (`userId`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_listing_idx` ON `watchlistEntries` (`listingId`);