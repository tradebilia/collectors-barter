CREATE TABLE `itemInquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`listingId` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itemInquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `itemInquiries` ADD CONSTRAINT `itemInquiries_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itemInquiries` ADD CONSTRAINT `itemInquiries_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itemInquiries` ADD CONSTRAINT `itemInquiries_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `itemInquiries_sender_idx` ON `itemInquiries` (`senderId`);--> statement-breakpoint
CREATE INDEX `itemInquiries_recipient_idx` ON `itemInquiries` (`recipientId`);--> statement-breakpoint
CREATE INDEX `itemInquiries_listing_idx` ON `itemInquiries` (`listingId`);--> statement-breakpoint
CREATE INDEX `itemInquiries_recipient_unread_idx` ON `itemInquiries` (`recipientId`,`isRead`);