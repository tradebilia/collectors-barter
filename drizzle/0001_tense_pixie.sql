ALTER TABLE `inquiryReplies` ADD `recipientId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiryReplies` ADD `isRead` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiryReplies` ADD CONSTRAINT `inquiryReplies_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inquiryReplies_recipient_idx` ON `inquiryReplies` (`recipientId`);--> statement-breakpoint
CREATE INDEX `inquiryReplies_recipient_unread_idx` ON `inquiryReplies` (`recipientId`,`isRead`);