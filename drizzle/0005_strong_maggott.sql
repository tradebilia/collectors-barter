CREATE TABLE `accountApprovalReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
	`reasonCode` varchar(80) NOT NULL,
	`emailFirstSeenAt` timestamp,
	`adminNote` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `accountApprovalReviews` ADD CONSTRAINT `accountApprovalReviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accountApprovalReviews` ADD CONSTRAINT `accountApprovalReviews_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accountApprovalReviews_userId_unique` ON `accountApprovalReviews` (`userId`);--> statement-breakpoint
CREATE INDEX `accountApprovalReviews_status_idx` ON `accountApprovalReviews` (`status`);--> statement-breakpoint
CREATE INDEX `accountApprovalReviews_createdAt_idx` ON `accountApprovalReviews` (`createdAt`);
