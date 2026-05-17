CREATE TABLE `listingPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`imageUrl` text NOT NULL,
	`altText` varchar(180),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listingPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins') NOT NULL,
	`condition` enum('mint','near_mint','very_good','good','fair','poor') NOT NULL,
	`grade` enum('ungraded','1','1.5','2','2.5','3','3.5','4','4.5','5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10') NOT NULL DEFAULT 'ungraded',
	`certificationCompany` varchar(50),
	`estimatedValue` decimal(12,2),
	`description` text NOT NULL,
	`status` enum('active','traded','archived') NOT NULL DEFAULT 'active',
	`isActive` boolean NOT NULL DEFAULT true,
	`featured` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tradeMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tradeMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tradeProposalItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`offeredListingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tradeProposalItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `tradeProposalItems_unique_item` UNIQUE(`proposalId`,`offeredListingId`)
);
--> statement-breakpoint
CREATE TABLE `tradeProposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`recipientId` int NOT NULL,
	`requestedListingId` int NOT NULL,
	`note` text,
	`status` enum('pending','accepted','declined','completed','cancelled') NOT NULL DEFAULT 'pending',
	`respondedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tradeProposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tradeReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`revieweeId` int NOT NULL,
	`rating` int NOT NULL,
	`review` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tradeReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `tradeReviews_unique_reviewer_per_proposal` UNIQUE(`proposalId`,`reviewerId`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`avatarUrl` text,
	`avatarKey` varchar(255),
	`bio` text,
	`contactFullName` varchar(160),
	`contactEmail` varchar(320),
	`contactPhone` varchar(40),
	`contactAddress` text,
	`acceptedTerms` boolean NOT NULL DEFAULT false,
	`isMerchant` boolean NOT NULL DEFAULT false,
	`securityQuestion` varchar(255),
	`securityAnswer` varchar(255),
	`preferredCategories` text,
	`notificationPreferences` text,
	`emailVerified` boolean NOT NULL DEFAULT false,
	`phoneVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `watchlistEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`listingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlistEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `watchlistEntries_unique_user_listing` UNIQUE(`userId`,`listingId`)
);
--> statement-breakpoint
ALTER TABLE `listingPhotos` ADD CONSTRAINT `listingPhotos_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listings` ADD CONSTRAINT `listings_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeMessages` ADD CONSTRAINT `tradeMessages_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeMessages` ADD CONSTRAINT `tradeMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposalItems` ADD CONSTRAINT `tradeProposalItems_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposalItems` ADD CONSTRAINT `tradeProposalItems_offeredListingId_listings_id_fk` FOREIGN KEY (`offeredListingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeProposals` ADD CONSTRAINT `tradeProposals_requestedListingId_listings_id_fk` FOREIGN KEY (`requestedListingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_reviewerId_users_id_fk` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tradeReviews` ADD CONSTRAINT `tradeReviews_revieweeId_users_id_fk` FOREIGN KEY (`revieweeId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlistEntries` ADD CONSTRAINT `watchlistEntries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlistEntries` ADD CONSTRAINT `watchlistEntries_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `listingPhotos_listing_idx` ON `listingPhotos` (`listingId`);--> statement-breakpoint
CREATE INDEX `listings_owner_idx` ON `listings` (`ownerId`);--> statement-breakpoint
CREATE INDEX `listings_category_idx` ON `listings` (`category`);--> statement-breakpoint
CREATE INDEX `listings_condition_idx` ON `listings` (`condition`);--> statement-breakpoint
CREATE INDEX `listings_status_idx` ON `listings` (`status`);--> statement-breakpoint
CREATE INDEX `tradeMessages_proposal_idx` ON `tradeMessages` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeMessages_sender_idx` ON `tradeMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_proposal_idx` ON `tradeProposalItems` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeProposalItems_offeredListing_idx` ON `tradeProposalItems` (`offeredListingId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_requester_idx` ON `tradeProposals` (`requesterId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_recipient_idx` ON `tradeProposals` (`recipientId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_requestedListing_idx` ON `tradeProposals` (`requestedListingId`);--> statement-breakpoint
CREATE INDEX `tradeProposals_status_idx` ON `tradeProposals` (`status`);--> statement-breakpoint
CREATE INDEX `tradeReviews_proposal_idx` ON `tradeReviews` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_reviewer_idx` ON `tradeReviews` (`reviewerId`);--> statement-breakpoint
CREATE INDEX `tradeReviews_reviewee_idx` ON `tradeReviews` (`revieweeId`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_user_idx` ON `watchlistEntries` (`userId`);--> statement-breakpoint
CREATE INDEX `watchlistEntries_listing_idx` ON `watchlistEntries` (`listingId`);