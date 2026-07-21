CREATE TABLE `moderationLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`targetUserId` int NOT NULL,
	`action` enum('warn','ban','unban','suspend','unsuspend','delete') NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
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
ALTER TABLE `tradeProposals` ADD `referenceNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `ebaySellerLevel` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `ebayIdVerified` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isBanned` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bannedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `banReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `warnCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastWarnedAt` timestamp;--> statement-breakpoint
ALTER TABLE `moderationLog` ADD CONSTRAINT `moderationLog_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moderationLog` ADD CONSTRAINT `moderationLog_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userWarnings` ADD CONSTRAINT `userWarnings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userWarnings` ADD CONSTRAINT `userWarnings_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `moderationLog_admin_idx` ON `moderationLog` (`adminId`);--> statement-breakpoint
CREATE INDEX `moderationLog_target_idx` ON `moderationLog` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `moderationLog_action_idx` ON `moderationLog` (`action`);--> statement-breakpoint
CREATE INDEX `moderationLog_createdAt_idx` ON `moderationLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `userWarnings_user_idx` ON `userWarnings` (`userId`);--> statement-breakpoint
CREATE INDEX `userWarnings_admin_idx` ON `userWarnings` (`adminId`);