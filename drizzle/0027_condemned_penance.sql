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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ebayFeedbackHistory_id` PRIMARY KEY(`id`)
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
	`flaggedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewedBy` int,
	CONSTRAINT `lowFeedbackFlags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `ebayUsername` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `ebayUserId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `ebayFeedbackScore` int;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayFeedbackPercentage` decimal(5,2);--> statement-breakpoint
ALTER TABLE `users` ADD `ebayMemberSince` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayConnectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayAccessToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayRefreshToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayTokenExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `ebayFeedbackHistory` ADD CONSTRAINT `ebayFeedbackHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lowFeedbackFlags` ADD CONSTRAINT `lowFeedbackFlags_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lowFeedbackFlags` ADD CONSTRAINT `lowFeedbackFlags_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ebayFeedbackHistory_userId_idx` ON `ebayFeedbackHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `ebayFeedbackHistory_feedbackId_idx` ON `ebayFeedbackHistory` (`feedbackId`);--> statement-breakpoint
CREATE INDEX `ebayFeedbackHistory_feedbackDate_idx` ON `ebayFeedbackHistory` (`feedbackDate`);--> statement-breakpoint
CREATE INDEX `lowFeedbackFlags_userId_idx` ON `lowFeedbackFlags` (`userId`);--> statement-breakpoint
CREATE INDEX `lowFeedbackFlags_status_idx` ON `lowFeedbackFlags` (`status`);--> statement-breakpoint
CREATE INDEX `lowFeedbackFlags_flaggedAt_idx` ON `lowFeedbackFlags` (`flaggedAt`);