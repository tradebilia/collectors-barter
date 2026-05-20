CREATE TABLE `draftListings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins') NOT NULL,
	`grade` enum('ungraded','1','1.5','2','2.5','3','3.5','4','4.5','5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10') NOT NULL DEFAULT 'ungraded',
	`graderCompany` varchar(100),
	`certificationNumber` varchar(100),
	`estimatedValue` decimal(12,2),
	`categoryFields` text,
	`additionalNotes` text,
	`photos` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `draftListings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `draftListings` ADD CONSTRAINT `draftListings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `draftListings_user_idx` ON `draftListings` (`userId`);--> statement-breakpoint
CREATE INDEX `draftListings_createdAt_idx` ON `draftListings` (`createdAt`);