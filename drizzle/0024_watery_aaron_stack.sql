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
	`deletedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deletedAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `deletedAccounts` ADD CONSTRAINT `deletedAccounts_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `deletedAccounts_userId_idx` ON `deletedAccounts` (`userId`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_username_idx` ON `deletedAccounts` (`username`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_email_idx` ON `deletedAccounts` (`email`);--> statement-breakpoint
CREATE INDEX `deletedAccounts_deletedAt_idx` ON `deletedAccounts` (`deletedAt`);