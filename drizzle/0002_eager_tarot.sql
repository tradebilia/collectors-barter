CREATE TABLE `flaggedContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentType` enum('listing','user','trade') NOT NULL,
	`contentId` int NOT NULL,
	`flaggedByUserId` int NOT NULL,
	`reason` varchar(100) NOT NULL,
	`description` text,
	`status` enum('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`reviewedByAdminId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `flaggedContent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportTicketReplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`isAdminReply` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `supportTicketReplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` varchar(20) NOT NULL,
	`userId` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`category` enum('general','listing','trade','account','billing','bug','other') NOT NULL DEFAULT 'general',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`adminNotes` text,
	`assignedAdminId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supportTickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `supportTickets_ticketId_unique` UNIQUE(`ticketId`)
);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `storeName` varchar(255);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `businessLicense` varchar(255);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `taxId` varchar(100);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `storeDescription` text;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `businessAddress` text;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `businessPhone` varchar(40);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `businessEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `businessWebsite` varchar(512);--> statement-breakpoint
ALTER TABLE `flaggedContent` ADD CONSTRAINT `flaggedContent_flaggedByUserId_users_id_fk` FOREIGN KEY (`flaggedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flaggedContent` ADD CONSTRAINT `flaggedContent_reviewedByAdminId_users_id_fk` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTicketReplies` ADD CONSTRAINT `supportTicketReplies_ticketId_supportTickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `supportTickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTicketReplies` ADD CONSTRAINT `supportTicketReplies_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD CONSTRAINT `supportTickets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportTickets` ADD CONSTRAINT `supportTickets_assignedAdminId_users_id_fk` FOREIGN KEY (`assignedAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `flaggedContent_contentType_idx` ON `flaggedContent` (`contentType`);--> statement-breakpoint
CREATE INDEX `flaggedContent_status_idx` ON `flaggedContent` (`status`);--> statement-breakpoint
CREATE INDEX `flaggedContent_createdAt_idx` ON `flaggedContent` (`createdAt`);--> statement-breakpoint
CREATE INDEX `supportTicketReplies_ticket_idx` ON `supportTicketReplies` (`ticketId`);--> statement-breakpoint
CREATE INDEX `supportTicketReplies_sender_idx` ON `supportTicketReplies` (`senderId`);--> statement-breakpoint
CREATE INDEX `supportTickets_userId_idx` ON `supportTickets` (`userId`);--> statement-breakpoint
CREATE INDEX `supportTickets_status_idx` ON `supportTickets` (`status`);--> statement-breakpoint
CREATE INDEX `supportTickets_createdAt_idx` ON `supportTickets` (`createdAt`);