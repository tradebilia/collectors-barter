CREATE TABLE `forumFollows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `forumFollows_post_user_unique` UNIQUE(`postId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `forumPostAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`imageUrl` text NOT NULL,
	`altText` varchar(180),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `forumReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`reporterId` int NOT NULL,
	`reason` varchar(80) NOT NULL,
	`details` text,
	`status` enum('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `subcategory` varchar(64);--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `status` enum('active','removed') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `removedAt` timestamp;--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `removedBy` int;--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `removalReason` text;--> statement-breakpoint
ALTER TABLE `forumFollows` ADD CONSTRAINT `forumFollows_postId_forumPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `forumPosts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumFollows` ADD CONSTRAINT `forumFollows_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumPostAttachments` ADD CONSTRAINT `forumPostAttachments_postId_forumPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `forumPosts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumPostAttachments` ADD CONSTRAINT `forumPostAttachments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReports` ADD CONSTRAINT `forumReports_postId_forumPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `forumPosts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReports` ADD CONSTRAINT `forumReports_reporterId_users_id_fk` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReports` ADD CONSTRAINT `forumReports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `forumFollows_user_idx` ON `forumFollows` (`userId`);--> statement-breakpoint
CREATE INDEX `forumPostAttachments_post_idx` ON `forumPostAttachments` (`postId`);--> statement-breakpoint
CREATE INDEX `forumPostAttachments_user_idx` ON `forumPostAttachments` (`userId`);--> statement-breakpoint
CREATE INDEX `forumReports_post_idx` ON `forumReports` (`postId`);--> statement-breakpoint
CREATE INDEX `forumReports_reporter_idx` ON `forumReports` (`reporterId`);--> statement-breakpoint
CREATE INDEX `forumReports_status_idx` ON `forumReports` (`status`);--> statement-breakpoint
ALTER TABLE `forumPosts` ADD CONSTRAINT `forumPosts_removedBy_users_id_fk` FOREIGN KEY (`removedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `forumPosts_subcategory_idx` ON `forumPosts` (`subcategory`);--> statement-breakpoint
CREATE INDEX `forumPosts_status_idx` ON `forumPosts` (`status`);