CREATE TABLE `conventionCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conventionId` int NOT NULL,
	`category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins','all') NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conventions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins','all') NOT NULL DEFAULT 'all',
	`startDate` varchar(20) NOT NULL,
	`endDate` varchar(20),
	`city` varchar(100),
	`state` varchar(100),
	`country` varchar(100) NOT NULL DEFAULT 'United States',
	`venue` varchar(255),
	`website` varchar(500),
	`admission` varchar(100),
	`description` text,
	`source` varchar(100) DEFAULT 'user',
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`submittedBy` int,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
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
CREATE TABLE `directMessageThreads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantAId` int NOT NULL,
	`participantBId` int NOT NULL,
	`itemId` int,
	`lastMessageAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `directMessageThreads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `directMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`senderId` int NOT NULL,
	`subject` varchar(255),
	`body` text NOT NULL,
	`isReadByRecipient` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `directMessages_id` PRIMARY KEY(`id`)
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
CREATE TABLE `flaggedContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentType` enum('listing','user','trade') NOT NULL,
	`contentId` int NOT NULL,
	`flaggedByUserId` int NOT NULL,
	`reason` varchar(100) NOT NULL,
	`description` text,
	`status` enum('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`reviewedByAdminId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `flaggedContent_id` PRIMARY KEY(`id`)
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
	`signatures` text,
	`certificationNumber` varchar(100)
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
CREATE TABLE `moderationLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`targetUserId` int NOT NULL,
	`action` enum('warn','ban','unban','suspend','unsuspend','delete') NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
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
CREATE TABLE `proposalReadStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`userId` int NOT NULL,
	`lastReadAt` timestamp,
	`isRead` tinyint DEFAULT 0
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
CREATE TABLE `supportTicketReplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`isAdminReply` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `supportTicketReplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` varchar(20) NOT NULL,
	`userId` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`category` enum('general','listing','trade','account','billing','bug','other') NOT NULL DEFAULT 'general',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`adminNotes` text,
	`assignedAdminId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supportTickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `supportTickets_ticketId_unique` UNIQUE(`ticketId`)
);
--> statement-breakpoint
CREATE TABLE `tradeActivityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`actorId` int NOT NULL,
	`actorName` varchar(255) NOT NULL,
	`eventType` enum('trade_created','partner_joined','item_added','item_removed','cash_added','cash_removed','proposal_sent','proposal_accepted','proposal_declined','trade_cancelled','tracking_submitted','items_received','trade_completed','payment_step_started','payment_verification_started','payment_verified','payment_verification_failed') NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeAdminLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`eventType` enum('initiated','declined','negotiating','accepted','shipped','completed','cancelled','disputed','adminOverride') NOT NULL,
	`actorUserId` int,
	`details` text,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`alertType` enum('initiated','declined','counterProposal','accepted','shipped','received','completed','cancelled','reminder','damaged') NOT NULL,
	`message` text,
	`isRead` tinyint DEFAULT 0,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeComplaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`complaintUserId` int NOT NULL,
	`description` text NOT NULL,
	`complaintType` enum('damaged','missing','notAsDescribed','other') NOT NULL,
	`photos` text,
	`status` enum('filed','resolved','dismissed') DEFAULT 'filed',
	`adminNotes` text,
	`resolvedAt` timestamp,
	`resolvedByAdminId` int,
	`resolution` enum('completed','cancelled'),
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`messageType` varchar(20) DEFAULT 'regular',
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `tradePayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`payerId` int NOT NULL,
	`payeeId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paypalEmail` varchar(320) NOT NULL,
	`transactionId` varchar(255),
	`status` enum('pending','submitted','verified','failed') NOT NULL DEFAULT 'pending',
	`verificationResult` text,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tradePayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tradePrivateNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`userId` int NOT NULL,
	`noteContent` text NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
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
	`status` enum('pending','negotiating','accepted','shipping','shipped','declined','completed','cancelled','frozen') NOT NULL DEFAULT 'pending',
	`preFreezStatus` varchar(20),
	`frozenAt` timestamp,
	`frozenReason` text,
	`respondedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`tradeReferenceNumber` varchar(20),
	`negotiatingAt` timestamp,
	`acceptedAt` timestamp,
	`shippingAt` timestamp,
	`shippedAt` timestamp,
	`shippingDeadline` timestamp,
	`receiptDeadline` timestamp,
	`feedbackDeadline` timestamp,
	`lastActivityAt` timestamp,
	`initiatorMessage` text,
	`declineReason` text,
	`cashFromRequester` decimal(12,2),
	`cashFromRecipient` decimal(12,2),
	`middleManRequested` tinyint DEFAULT 0,
	`middleManApproved` tinyint DEFAULT 0,
	`middleManRequestedBy` int,
	`lastProposedBy` int,
	`referenceNumber` varchar(20)
);
--> statement-breakpoint
CREATE TABLE `tradeReceiptConfirmation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`userId` int NOT NULL,
	`confirmationType` enum('received','damaged','accepted') NOT NULL DEFAULT 'received',
	`confirmedAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`revieweeId` int NOT NULL,
	`rating` int NOT NULL,
	`review` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`tradeExperienceRating` int,
	`itemConditionRating` int,
	`communicationRating` int,
	`shippingSpeedRating` int,
	`overallRating` decimal(2,1),
	`photos` text,
	`isVisible` tinyint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `tradeTrackingNumbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`userId` int NOT NULL,
	`listingId` int NOT NULL,
	`carrier` enum('USPS','UPS','FedEx','DHL','Other') NOT NULL,
	`carrierOther` varchar(100),
	`trackingNumber` varchar(50) NOT NULL,
	`trackingUrl` varchar(500),
	`submittedAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeVotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`votingLinkId` int NOT NULL,
	`voterUserId` int NOT NULL,
	`verdict` enum('steal','fair','pass') NOT NULL,
	`comment` text,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tradeVotingLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`generatedByUserId` int NOT NULL,
	`linkToken` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `userFollows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
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
	`storeName` varchar(255),
	`businessLicense` varchar(255),
	`taxId` varchar(100),
	`storeDescription` text,
	`businessAddress` text,
	`businessPhone` varchar(40),
	`businessEmail` varchar(320),
	`businessWebsite` varchar(512),
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
CREATE TABLE `userRatingSummary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalTrades` int DEFAULT 0,
	`avgTradeExperience` decimal(2,1) DEFAULT '0.0',
	`avgItemCondition` decimal(2,1) DEFAULT '0.0',
	`avgCommunication` decimal(2,1) DEFAULT '0.0',
	`avgShippingSpeed` decimal(2,1) DEFAULT '0.0',
	`avgOverallRating` decimal(2,1) DEFAULT '0.0',
	`lastUpdatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
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
CREATE TABLE `userWarnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`adminId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `watchlistEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`listingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `displayName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `securityQuestion` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `securityAnswerHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `lastActivityAt` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayUsername` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `ebayUserId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `ebayFeedbackScore` int;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayFeedbackPercentage` decimal(5,2);--> statement-breakpoint
ALTER TABLE `users` ADD `ebayMemberSince` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `ebaySellerLevel` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `ebayIdVerified` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_star` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_positive_12mo` int;--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_neutral_12mo` int;--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_negative_12mo` int;--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_is_store_owner` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayConnectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayAccessToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayRefreshToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayTokenExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `facebookId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `facebookName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `facebookVerified` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `facebookConnectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `facebookAccessToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `facebookEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `facebookPicture` text;--> statement-breakpoint
ALTER TABLE `users` ADD `facebookLocation` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `facebookLink` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `facebookLikes` json;--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinPicture` text;--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinHeadline` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinProfileUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinAccessToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinConnectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `isSuspended` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedAt` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `suspensionReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isBanned` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bannedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `banReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bannedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `warnCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastWarnedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `paypalEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD `paypalVerified` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `paypalVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `deletedAccounts` ADD CONSTRAINT `deletedAccounts_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessageThreads` ADD CONSTRAINT `directMessageThreads_participantAId_users_id_fk` FOREIGN KEY (`participantAId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessageThreads` ADD CONSTRAINT `directMessageThreads_participantBId_users_id_fk` FOREIGN KEY (`participantBId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessageThreads` ADD CONSTRAINT `directMessageThreads_itemId_listings_id_fk` FOREIGN KEY (`itemId`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessages` ADD CONSTRAINT `directMessages_threadId_directMessageThreads_id_fk` FOREIGN KEY (`threadId`) REFERENCES `directMessageThreads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessages` ADD CONSTRAINT `directMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `draftListings` ADD CONSTRAINT `draftListings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ebayFeedbackHistory` ADD CONSTRAINT `ebayFeedbackHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flaggedContent` ADD CONSTRAINT `flaggedContent_flaggedByUserId_users_id_fk` FOREIGN KEY (`flaggedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flaggedContent` ADD CONSTRAINT `flaggedContent_reviewedByAdminId_users_id_fk` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `proposalReadStatus` ADD CONSTRAINT `proposalReadStatus_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposalReadStatus` ADD CONSTRAINT `proposalReadStatus_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_joinedUserId_users_id_fk` FOREIGN KEY (`joinedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTicketReplies` ADD CONSTRAINT `supportTicketReplies_ticketId_supportTickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `supportTickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTicketReplies` ADD CONSTRAINT `supportTicketReplies_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD CONSTRAINT `supportTickets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD CONSTRAINT `supportTickets_assignedAdminId_users_id_fk` FOREIGN KEY (`assignedAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeActivityLog` ADD CONSTRAINT `tradeActivityLog_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeActivityLog` ADD CONSTRAINT `tradeActivityLog_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeAdminLog` ADD CONSTRAINT `tradeAdminLog_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeAlerts` ADD CONSTRAINT `tradeAlerts_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeAlerts` ADD CONSTRAINT `tradeAlerts_recipientUserId_users_id_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeComplaints` ADD CONSTRAINT `tradeComplaints_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeComplaints` ADD CONSTRAINT `tradeComplaints_complaintUserId_users_id_fk` FOREIGN KEY (`complaintUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeMessages` ADD CONSTRAINT `tradeMessages_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeMessages` ADD CONSTRAINT `tradeMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradePayments` ADD CONSTRAINT `tradePayments_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradePayments` ADD CONSTRAINT `tradePayments_payerId_users_id_fk` FOREIGN KEY (`payerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradePayments` ADD CONSTRAINT `tradePayments_payeeId_users_id_fk` FOREIGN KEY (`payeeId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradePrivateNotes` ADD CONSTRAINT `tradePrivateNotes_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradePrivateNotes` ADD CONSTRAINT `tradePrivateNotes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposalItems` ADD CONSTRAINT `tradeProposalItems_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposalItems` ADD CONSTRAINT `tradeProposalItems_offeredListingId_listings_id_fk` FOREIGN KEY (`offeredListingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_requestedListingId_listings_id_fk` FOREIGN KEY (`requestedListingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReceiptConfirmation` ADD CONSTRAINT `tradeReceiptConfirmation_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReceiptConfirmation` ADD CONSTRAINT `tradeReceiptConfirmation_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_reviewerId_users_id_fk` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_revieweeId_users_id_fk` FOREIGN KEY (`revieweeId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeTrackingNumbers` ADD CONSTRAINT `tradeTrackingNumbers_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeTrackingNumbers` ADD CONSTRAINT `tradeTrackingNumbers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeTrackingNumbers` ADD CONSTRAINT `tradeTrackingNumbers_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeVotes` ADD CONSTRAINT `tradeVotes_votingLinkId_tradeVotingLinks_id_fk` FOREIGN KEY (`votingLinkId`) REFERENCES `tradeVotingLinks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeVotes` ADD CONSTRAINT `tradeVotes_voterUserId_users_id_fk` FOREIGN KEY (`voterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeVotingLinks` ADD CONSTRAINT `tradeVotingLinks_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeVotingLinks` ADD CONSTRAINT `tradeVotingLinks_generatedByUserId_users_id_fk` FOREIGN KEY (`generatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userRatingSummary` ADD CONSTRAINT `userRatingSummary_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reportedUserId_users_id_fk` FOREIGN KEY (`reportedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlistEntries` ADD CONSTRAINT `watchlistEntries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlistEntries` ADD CONSTRAINT `watchlistEntries_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cc_convention_idx` ON `conventionCategories` (`conventionId`);--> statement-breakpoint
CREATE INDEX `cc_category_idx` ON `conventionCategories` (`category`);--> statement-breakpoint
CREATE INDEX `cc_unique` ON `conventionCategories` (`conventionId`,`category`);--> statement-breakpoint
CREATE INDEX `conventions_category_idx` ON `conventions` (`category`);--> statement-breakpoint
CREATE INDEX `conventions_startDate_idx` ON `conventions` (`startDate`);--> statement-breakpoint
CREATE INDEX `conventions_status_idx` ON `conventions` (`status`);--> statement-breakpoint
CREATE INDEX `conventions_country_idx` ON `conventions` (`country`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_userId_idx` ON `deletedAccounts` (`userId`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_username_idx` ON `deletedAccounts` (`username`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_email_idx` ON `deletedAccounts` (`email`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_deletedAt_idx` ON `deletedAccounts` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `dmThreads_participantA_idx` ON `directMessageThreads` (`participantAId`);--> statement-breakpoint
CREATE INDEX `dmThreads_participantB_idx` ON `directMessageThreads` (`participantBId`);--> statement-breakpoint
CREATE INDEX `dmThreads_itemId_idx` ON `directMessageThreads` (`itemId`);--> statement-breakpoint
CREATE INDEX `dmThreads_lastMessage_idx` ON `directMessageThreads` (`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `directMessages_thread_idx` ON `directMessages` (`threadId`);--> statement-breakpoint
CREATE INDEX `directMessages_sender_idx` ON `directMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `directMessages_createdAt_idx` ON `directMessages` (`createdAt`);--> statement-breakpoint
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
CREATE INDEX `flaggedContent_contentType_idx` ON `flaggedContent` (`contentType`);--> statement-breakpoint
CREATE INDEX `flaggedContent_status_idx` ON `flaggedContent` (`status`);--> statement-breakpoint
CREATE INDEX `flaggedContent_createdAt_idx` ON `flaggedContent` (`createdAt`);--> statement-breakpoint
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
CREATE INDEX `moderationLog_admin_idx` ON `moderationLog` (`adminId`);--> statement-breakpoint
CREATE INDEX `moderationLog_target_idx` ON `moderationLog` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `moderationLog_action_idx` ON `moderationLog` (`action`);--> statement-breakpoint
CREATE INDEX `moderationLog_createdAt_idx` ON `moderationLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_token_unique` ON `passwordResetTokens` (`token`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_user_idx` ON `passwordResetTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_expiresAt_idx` ON `passwordResetTokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `phoneVerificationOtps_phone_idx` ON `phoneVerificationOtps` (`phone`);--> statement-breakpoint
CREATE INDEX `phoneVerificationOtps_expiresAt_idx` ON `phoneVerificationOtps` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `unique_proposal_user` ON `proposalReadStatus` (`proposalId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_proposalRead_proposal` ON `proposalReadStatus` (`proposalId`);--> statement-breakpoint
CREATE INDEX `referralRequests_referrer_idx` ON `referralRequests` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referralRequests_status_idx` ON `referralRequests` (`status`);--> statement-breakpoint
CREATE INDEX `referralRequests_createdAt_idx` ON `referralRequests` (`createdAt`);--> statement-breakpoint
CREATE INDEX `referralRequests_emailSent_idx` ON `referralRequests` (`emailSent`);--> statement-breakpoint
CREATE INDEX `referralRequests_hasJoined_idx` ON `referralRequests` (`hasJoined`);--> statement-breakpoint
CREATE INDEX `supportTicketReplies_ticket_idx` ON `supportTicketReplies` (`ticketId`);--> statement-breakpoint
CREATE INDEX `supportTicketReplies_sender_idx` ON `supportTicketReplies` (`senderId`);--> statement-breakpoint
CREATE INDEX `supportTickets_userId_idx` ON `supportTickets` (`userId`);--> statement-breakpoint
CREATE INDEX `supportTickets_status_idx` ON `supportTickets` (`status`);--> statement-breakpoint
CREATE INDEX `supportTickets_createdAt_idx` ON `supportTickets` (`createdAt`);--> statement-breakpoint
CREATE INDEX `tradeActivityLog_proposal_idx` ON `tradeActivityLog` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeActivityLog_actor_idx` ON `tradeActivityLog` (`actorId`);--> statement-breakpoint
CREATE INDEX `tradeActivityLog_createdAt_idx` ON `tradeActivityLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_tradeAdminLog_proposal` ON `tradeAdminLog` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeAdminLog_event` ON `tradeAdminLog` (`eventType`);--> statement-breakpoint
CREATE INDEX `idx_tradeAdminLog_createdAt` ON `tradeAdminLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_tradeAlerts_recipient` ON `tradeAlerts` (`recipientUserId`);--> statement-breakpoint
CREATE INDEX `idx_tradeAlerts_proposal` ON `tradeAlerts` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeAlerts_unread` ON `tradeAlerts` (`recipientUserId`,`isRead`);--> statement-breakpoint
CREATE INDEX `idx_tradeAlerts_createdAt` ON `tradeAlerts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_tradeComplaints_proposal` ON `tradeComplaints` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeComplaints_status` ON `tradeComplaints` (`status`);--> statement-breakpoint
CREATE INDEX `tradeMessages_proposal_idx` ON `tradeMessages` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeMessages_sender_idx` ON `tradeMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `tradePayments_proposalId_idx` ON `tradePayments` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradePayments_payerId_idx` ON `tradePayments` (`payerId`);--> statement-breakpoint
CREATE INDEX `tradePayments_payeeId_idx` ON `tradePayments` (`payeeId`);--> statement-breakpoint
CREATE INDEX `tradePayments_status_idx` ON `tradePayments` (`status`);--> statement-breakpoint
CREATE INDEX `unique_note_per_trade` ON `tradePrivateNotes` (`proposalId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_tradeNotes_proposal` ON `tradePrivateNotes` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_unique_item` ON `tradeProposalItems` (`proposalId`,`offeredListingId`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_proposal_idx` ON `tradeProposalItems` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_offeredListing_idx` ON `tradeProposalItems` (`offeredListingId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_requester_idx` ON `tradeProposals` (`requesterId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_recipient_idx` ON `tradeProposals` (`recipientId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_requestedListing_idx` ON `tradeProposals` (`requestedListingId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_status_idx` ON `tradeProposals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tradeReferenceNumber` ON `tradeProposals` (`tradeReferenceNumber`);--> statement-breakpoint
CREATE INDEX `idx_lastActivityAt` ON `tradeProposals` (`lastActivityAt`);--> statement-breakpoint
CREATE INDEX `unique_proposal_user` ON `tradeReceiptConfirmation` (`proposalId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_tradeReceipt_proposal` ON `tradeReceiptConfirmation` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_unique_reviewer_per_proposal` ON `tradeReviews` (`proposalId`,`reviewerId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_proposal_idx` ON `tradeReviews` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_reviewer_idx` ON `tradeReviews` (`reviewerId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_reviewee_idx` ON `tradeReviews` (`revieweeId`);--> statement-breakpoint
CREATE INDEX `idx_tradeTracking_proposal` ON `tradeTrackingNumbers` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeTracking_user` ON `tradeTrackingNumbers` (`userId`);--> statement-breakpoint
CREATE INDEX `unique_voter_per_link` ON `tradeVotes` (`votingLinkId`,`voterUserId`);--> statement-breakpoint
CREATE INDEX `idx_tradeVotes_link` ON `tradeVotes` (`votingLinkId`);--> statement-breakpoint
CREATE INDEX `idx_tradeVoting_proposal` ON `tradeVotingLinks` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeVoting_token` ON `tradeVotingLinks` (`linkToken`);--> statement-breakpoint
CREATE INDEX `idx_tradeVoting_expires` ON `tradeVotingLinks` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `linkToken` ON `tradeVotingLinks` (`linkToken`);--> statement-breakpoint
CREATE INDEX `userFollows_follower_idx` ON `userFollows` (`followerId`);--> statement-breakpoint
CREATE INDEX `userFollows_following_idx` ON `userFollows` (`followingId`);--> statement-breakpoint
CREATE INDEX `userFollows_unique` ON `userFollows` (`followerId`,`followingId`);--> statement-breakpoint
CREATE INDEX `userProfiles_userId_unique` ON `userProfiles` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_userRating_userId` ON `userRatingSummary` (`userId`);--> statement-breakpoint
CREATE INDEX `userId` ON `userRatingSummary` (`userId`);--> statement-breakpoint
CREATE INDEX `userReports_reportId_unique` ON `userReports` (`reportId`);--> statement-breakpoint
CREATE INDEX `userReports_reportedUserId_idx` ON `userReports` (`reportedUserId`);--> statement-breakpoint
CREATE INDEX `userReports_reporterUserId_idx` ON `userReports` (`reporterUserId`);--> statement-breakpoint
CREATE INDEX `userReports_status_idx` ON `userReports` (`status`);--> statement-breakpoint
CREATE INDEX `userReports_createdAt_idx` ON `userReports` (`createdAt`);--> statement-breakpoint
CREATE INDEX `userWarnings_user_idx` ON `userWarnings` (`userId`);--> statement-breakpoint
CREATE INDEX `userWarnings_admin_idx` ON `userWarnings` (`adminId`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_unique_user_listing` ON `watchlistEntries` (`userId`,`listingId`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_user_idx` ON `watchlistEntries` (`userId`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_listing_idx` ON `watchlistEntries` (`listingId`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `users_username_unique` ON `users` (`username`);