CREATE TABLE `drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins') NOT NULL,
	`title` varchar(160),
	`condition` enum('mint','near_mint','very_good','good','fair','poor'),
	`grade` enum('ungraded','1','1.5','2','2.5','3','3.5','4','4.5','5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10'),
	`certificationCompany` varchar(50),
	`description` text,
	`itemData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `drafts` ADD CONSTRAINT `drafts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `drafts_user_idx` ON `drafts` (`userId`);--> statement-breakpoint
CREATE INDEX `drafts_category_idx` ON `drafts` (`category`);