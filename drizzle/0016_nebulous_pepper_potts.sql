CREATE TABLE `forumNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`replyId` int,
	`kind` enum('topic_reply') NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `forumReplyAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`replyId` int NOT NULL,
	`userId` int NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`imageUrl` text NOT NULL,
	`altText` varchar(180),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `listingId` int;--> statement-breakpoint
ALTER TABLE `forumReplies` ADD `listingId` int;--> statement-breakpoint
ALTER TABLE `forumNotifications` ADD CONSTRAINT `forumNotifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumNotifications` ADD CONSTRAINT `forumNotifications_postId_forumPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `forumPosts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumNotifications` ADD CONSTRAINT `forumNotifications_replyId_forumReplies_id_fk` FOREIGN KEY (`replyId`) REFERENCES `forumReplies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReplyAttachments` ADD CONSTRAINT `forumReplyAttachments_replyId_forumReplies_id_fk` FOREIGN KEY (`replyId`) REFERENCES `forumReplies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReplyAttachments` ADD CONSTRAINT `forumReplyAttachments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `forumNotifications_user_read_idx` ON `forumNotifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `forumNotifications_post_idx` ON `forumNotifications` (`postId`);--> statement-breakpoint
CREATE INDEX `forumReplyAttachments_reply_idx` ON `forumReplyAttachments` (`replyId`);--> statement-breakpoint
CREATE INDEX `forumReplyAttachments_user_idx` ON `forumReplyAttachments` (`userId`);--> statement-breakpoint
CREATE INDEX `forumPosts_listing_idx` ON `forumPosts` (`listingId`);--> statement-breakpoint
CREATE INDEX `forumReplies_listing_idx` ON `forumReplies` (`listingId`);
