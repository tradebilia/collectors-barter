CREATE TABLE `proposalReadStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`userId` int NOT NULL,
	`lastReadAt` timestamp,
	`isRead` tinyint DEFAULT 0
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
CREATE TABLE `tradePrivateNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`userId` int NOT NULL,
	`noteContent` text NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
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
ALTER TABLE `conventions` DROP FOREIGN KEY `conventions_submittedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `conventions` DROP FOREIGN KEY `conventions_approvedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `moderationLog` DROP FOREIGN KEY `moderationLog_adminId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `moderationLog` DROP FOREIGN KEY `moderationLog_targetUserId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `tradeProposals` DROP FOREIGN KEY `tradeProposals_lastProposedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `userFollows` DROP FOREIGN KEY `userFollows_followerId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `userFollows` DROP FOREIGN KEY `userFollows_followingId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `userWarnings` DROP FOREIGN KEY `userWarnings_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `userWarnings` DROP FOREIGN KEY `userWarnings_adminId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `tradeProposals` MODIFY COLUMN `status` enum('pending','negotiating','accepted','shipping','shipped','declined','completed','cancelled','frozen') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `suspendedAt` datetime;--> statement-breakpoint
ALTER TABLE `tradeMessages` ADD `messageType` varchar(20) DEFAULT 'regular';--> statement-breakpoint
ALTER TABLE `tradeMessages` ADD `metadata` text;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `preFreezStatus` varchar(20);--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `frozenAt` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `frozenReason` text;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `tradeReferenceNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `negotiatingAt` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `acceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `shippingAt` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `shippedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `shippingDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `receiptDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `feedbackDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `lastActivityAt` timestamp;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `initiatorMessage` text;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `declineReason` text;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `cashFromRequester` decimal(12,2);--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `cashFromRecipient` decimal(12,2);--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `middleManRequested` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `middleManApproved` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `middleManRequestedBy` int;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD `tradeExperienceRating` int;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD `itemConditionRating` int;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD `communicationRating` int;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD `shippingSpeedRating` int;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD `overallRating` decimal(2,1);--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD `photos` text;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD `isVisible` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_star` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_positive_12mo` int;--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_neutral_12mo` int;--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_negative_12mo` int;--> statement-breakpoint
ALTER TABLE `users` ADD `ebay_is_store_owner` tinyint DEFAULT 0;--> statement-breakpoint
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
ALTER TABLE `users` ADD `suspensionReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `bannedBy` int;--> statement-breakpoint
ALTER TABLE `proposalReadStatus` ADD CONSTRAINT `proposalReadStatus_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposalReadStatus` ADD CONSTRAINT `proposalReadStatus_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeAdminLog` ADD CONSTRAINT `tradeAdminLog_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeAlerts` ADD CONSTRAINT `tradeAlerts_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeAlerts` ADD CONSTRAINT `tradeAlerts_recipientUserId_users_id_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeComplaints` ADD CONSTRAINT `tradeComplaints_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeComplaints` ADD CONSTRAINT `tradeComplaints_complaintUserId_users_id_fk` FOREIGN KEY (`complaintUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradePrivateNotes` ADD CONSTRAINT `tradePrivateNotes_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradePrivateNotes` ADD CONSTRAINT `tradePrivateNotes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReceiptConfirmation` ADD CONSTRAINT `tradeReceiptConfirmation_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReceiptConfirmation` ADD CONSTRAINT `tradeReceiptConfirmation_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeTrackingNumbers` ADD CONSTRAINT `tradeTrackingNumbers_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeTrackingNumbers` ADD CONSTRAINT `tradeTrackingNumbers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeTrackingNumbers` ADD CONSTRAINT `tradeTrackingNumbers_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeVotes` ADD CONSTRAINT `tradeVotes_votingLinkId_tradeVotingLinks_id_fk` FOREIGN KEY (`votingLinkId`) REFERENCES `tradeVotingLinks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeVotes` ADD CONSTRAINT `tradeVotes_voterUserId_users_id_fk` FOREIGN KEY (`voterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeVotingLinks` ADD CONSTRAINT `tradeVotingLinks_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeVotingLinks` ADD CONSTRAINT `tradeVotingLinks_generatedByUserId_users_id_fk` FOREIGN KEY (`generatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userRatingSummary` ADD CONSTRAINT `userRatingSummary_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `unique_proposal_user` ON `proposalReadStatus` (`proposalId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_proposalRead_proposal` ON `proposalReadStatus` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeAdminLog_proposal` ON `tradeAdminLog` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeAdminLog_event` ON `tradeAdminLog` (`eventType`);--> statement-breakpoint
CREATE INDEX `idx_tradeAdminLog_createdAt` ON `tradeAdminLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_tradeAlerts_recipient` ON `tradeAlerts` (`recipientUserId`);--> statement-breakpoint
CREATE INDEX `idx_tradeAlerts_proposal` ON `tradeAlerts` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeAlerts_unread` ON `tradeAlerts` (`recipientUserId`,`isRead`);--> statement-breakpoint
CREATE INDEX `idx_tradeAlerts_createdAt` ON `tradeAlerts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_tradeComplaints_proposal` ON `tradeComplaints` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeComplaints_status` ON `tradeComplaints` (`status`);--> statement-breakpoint
CREATE INDEX `unique_note_per_trade` ON `tradePrivateNotes` (`proposalId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_tradeNotes_proposal` ON `tradePrivateNotes` (`proposalId`);--> statement-breakpoint
CREATE INDEX `unique_proposal_user` ON `tradeReceiptConfirmation` (`proposalId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_tradeReceipt_proposal` ON `tradeReceiptConfirmation` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeTracking_proposal` ON `tradeTrackingNumbers` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeTracking_user` ON `tradeTrackingNumbers` (`userId`);--> statement-breakpoint
CREATE INDEX `unique_voter_per_link` ON `tradeVotes` (`votingLinkId`,`voterUserId`);--> statement-breakpoint
CREATE INDEX `idx_tradeVotes_link` ON `tradeVotes` (`votingLinkId`);--> statement-breakpoint
CREATE INDEX `idx_tradeVoting_proposal` ON `tradeVotingLinks` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_tradeVoting_token` ON `tradeVotingLinks` (`linkToken`);--> statement-breakpoint
CREATE INDEX `idx_tradeVoting_expires` ON `tradeVotingLinks` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `linkToken` ON `tradeVotingLinks` (`linkToken`);--> statement-breakpoint
CREATE INDEX `idx_userRating_userId` ON `userRatingSummary` (`userId`);--> statement-breakpoint
CREATE INDEX `userId` ON `userRatingSummary` (`userId`);--> statement-breakpoint
CREATE INDEX `cc_unique` ON `conventionCategories` (`conventionId`,`category`);--> statement-breakpoint
CREATE INDEX `idx_tradeReferenceNumber` ON `tradeProposals` (`tradeReferenceNumber`);--> statement-breakpoint
CREATE INDEX `idx_lastActivityAt` ON `tradeProposals` (`lastActivityAt`);