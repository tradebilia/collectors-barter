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
CREATE TABLE `emailVerificationOtps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`otp` varchar(6) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailVerificationOtps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passwordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordResetTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `phoneVerificationOtps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`otp` varchar(6) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phoneVerificationOtps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `listings` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `firstName` varchar(100);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `lastName` varchar(100);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `contactTown` varchar(100);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `contactState` varchar(100);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `contactZipCode` varchar(20);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `contactCountry` varchar(100);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `connectedAccounts` text;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `showProfile` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `hideInventoryValue` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `receiveContactRequests` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `displayName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `securityQuestion` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `securityAnswerHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `draftListings` ADD CONSTRAINT `draftListings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` ADD CONSTRAINT `passwordResetTokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `draftListings_user_idx` ON `draftListings` (`userId`);--> statement-breakpoint
CREATE INDEX `draftListings_createdAt_idx` ON `draftListings` (`createdAt`);--> statement-breakpoint
CREATE INDEX `emailVerificationOtps_email_idx` ON `emailVerificationOtps` (`email`);--> statement-breakpoint
CREATE INDEX `emailVerificationOtps_expiresAt_idx` ON `emailVerificationOtps` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_user_idx` ON `passwordResetTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `passwordResetTokens_expiresAt_idx` ON `passwordResetTokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `phoneVerificationOtps_phone_idx` ON `phoneVerificationOtps` (`phone`);--> statement-breakpoint
CREATE INDEX `phoneVerificationOtps_expiresAt_idx` ON `phoneVerificationOtps` (`expiresAt`);