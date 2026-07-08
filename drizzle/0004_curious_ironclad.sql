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
ALTER TABLE `deletedAccounts` MODIFY COLUMN `deletedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `draftListings` MODIFY COLUMN `grade` varchar(50) NOT NULL DEFAULT 'ungraded';--> statement-breakpoint
ALTER TABLE `draftListings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `ebayFeedbackHistory` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `emailVerificationOtps` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `favorites` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `forumPosts` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `forumReplies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `inquiryReplies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `itemInquiries` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listingPhotos` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `lowFeedbackFlags` MODIFY COLUMN `flaggedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `passwordResetTokens` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `phoneVerificationOtps` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `referralRequests` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tradeMessages` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tradeProposalItems` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tradeProposals` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tradeReviews` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `userProfiles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `userReports` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastActivityAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `watchlistEntries` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `conventions` ADD CONSTRAINT `conventions_submittedBy_users_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conventions` ADD CONSTRAINT `conventions_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `conventions_category_idx` ON `conventions` (`category`);--> statement-breakpoint
CREATE INDEX `conventions_startDate_idx` ON `conventions` (`startDate`);--> statement-breakpoint
CREATE INDEX `conventions_status_idx` ON `conventions` (`status`);--> statement-breakpoint
CREATE INDEX `conventions_country_idx` ON `conventions` (`country`);