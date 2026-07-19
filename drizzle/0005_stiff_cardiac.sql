CREATE TABLE `conventionCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conventionId` int NOT NULL,
	`category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins','all') NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tradeActivityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`actorId` int NOT NULL,
	`actorName` varchar(255) NOT NULL,
	`eventType` enum('trade_created','partner_joined','item_added','item_removed','cash_added','cash_removed','proposal_sent','proposal_accepted','proposal_declined','trade_cancelled','tracking_submitted','items_received','trade_completed') NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `userFollows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `tradeProposals` MODIFY COLUMN `status` enum('pending','negotiating','accepted','shipping','shipped','declined','completed','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD `lastProposedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isSuspended` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tradeActivityLog` ADD CONSTRAINT `tradeActivityLog_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeActivityLog` ADD CONSTRAINT `tradeActivityLog_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userFollows` ADD CONSTRAINT `userFollows_followerId_users_id_fk` FOREIGN KEY (`followerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userFollows` ADD CONSTRAINT `userFollows_followingId_users_id_fk` FOREIGN KEY (`followingId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cc_convention_idx` ON `conventionCategories` (`conventionId`);--> statement-breakpoint
CREATE INDEX `cc_category_idx` ON `conventionCategories` (`category`);--> statement-breakpoint
CREATE INDEX `tradeActivityLog_proposal_idx` ON `tradeActivityLog` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeActivityLog_actor_idx` ON `tradeActivityLog` (`actorId`);--> statement-breakpoint
CREATE INDEX `tradeActivityLog_createdAt_idx` ON `tradeActivityLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `userFollows_follower_idx` ON `userFollows` (`followerId`);--> statement-breakpoint
CREATE INDEX `userFollows_following_idx` ON `userFollows` (`followingId`);--> statement-breakpoint
CREATE INDEX `userFollows_unique` ON `userFollows` (`followerId`,`followingId`);--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_lastProposedBy_users_id_fk` FOREIGN KEY (`lastProposedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;