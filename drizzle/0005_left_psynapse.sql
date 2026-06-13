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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewedBy` int,
	CONSTRAINT `referralRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `referralRequests_referrer_idx` ON `referralRequests` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referralRequests_status_idx` ON `referralRequests` (`status`);--> statement-breakpoint
CREATE INDEX `referralRequests_createdAt_idx` ON `referralRequests` (`createdAt`);