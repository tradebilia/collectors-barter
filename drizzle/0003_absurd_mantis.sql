CREATE TABLE `directMessageThreads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantAId` int NOT NULL,
	`participantBId` int NOT NULL,
	`lastMessageAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `directMessageThreads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `directMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`senderId` int NOT NULL,
	`subject` varchar(255),
	`body` text NOT NULL,
	`isReadByRecipient` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `directMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `directMessageThreads` ADD CONSTRAINT `directMessageThreads_participantAId_users_id_fk` FOREIGN KEY (`participantAId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessageThreads` ADD CONSTRAINT `directMessageThreads_participantBId_users_id_fk` FOREIGN KEY (`participantBId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessages` ADD CONSTRAINT `directMessages_threadId_directMessageThreads_id_fk` FOREIGN KEY (`threadId`) REFERENCES `directMessageThreads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessages` ADD CONSTRAINT `directMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `dmThreads_participantA_idx` ON `directMessageThreads` (`participantAId`);--> statement-breakpoint
CREATE INDEX `dmThreads_participantB_idx` ON `directMessageThreads` (`participantBId`);--> statement-breakpoint
CREATE INDEX `dmThreads_lastMessage_idx` ON `directMessageThreads` (`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `directMessages_thread_idx` ON `directMessages` (`threadId`);--> statement-breakpoint
CREATE INDEX `directMessages_sender_idx` ON `directMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `directMessages_createdAt_idx` ON `directMessages` (`createdAt`);