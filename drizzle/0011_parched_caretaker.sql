CREATE TABLE `forumPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`isSolved` boolean NOT NULL DEFAULT false,
	`viewCount` int NOT NULL DEFAULT 0,
	`replyCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forumPosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forumReplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forumReplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forumPosts` ADD CONSTRAINT `forumPosts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReplies` ADD CONSTRAINT `forumReplies_postId_forumPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `forumPosts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forumReplies` ADD CONSTRAINT `forumReplies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `forumPosts_userId_idx` ON `forumPosts` (`userId`);--> statement-breakpoint
CREATE INDEX `forumPosts_category_idx` ON `forumPosts` (`category`);--> statement-breakpoint
CREATE INDEX `forumPosts_isPinned_idx` ON `forumPosts` (`isPinned`);--> statement-breakpoint
CREATE INDEX `forumPosts_createdAt_idx` ON `forumPosts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `forumReplies_postId_idx` ON `forumReplies` (`postId`);--> statement-breakpoint
CREATE INDEX `forumReplies_userId_idx` ON `forumReplies` (`userId`);--> statement-breakpoint
CREATE INDEX `forumReplies_createdAt_idx` ON `forumReplies` (`createdAt`);