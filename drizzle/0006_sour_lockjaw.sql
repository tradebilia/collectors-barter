ALTER TABLE `referralRequests` ADD `emailSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD `emailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD `hasJoined` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD `joinedAt` timestamp;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD `joinedUserId` int;--> statement-breakpoint
ALTER TABLE `referralRequests` ADD CONSTRAINT `referralRequests_joinedUserId_users_id_fk` FOREIGN KEY (`joinedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `referralRequests_emailSent_idx` ON `referralRequests` (`emailSent`);--> statement-breakpoint
CREATE INDEX `referralRequests_hasJoined_idx` ON `referralRequests` (`hasJoined`);