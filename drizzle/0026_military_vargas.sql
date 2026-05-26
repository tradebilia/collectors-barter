CREATE TABLE `userReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` varchar(20) NOT NULL,
	`reportedUserId` int NOT NULL,
	`reporterUserId` int NOT NULL,
	`reason` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`evidence` text,
	`status` enum('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`reviewedAt` timestamp,
	`reviewedBy` int,
	CONSTRAINT `userReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `userReports_reportId_unique` UNIQUE(`reportId`)
);
--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reportedUserId_users_id_fk` FOREIGN KEY (`reportedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userReports` ADD CONSTRAINT `userReports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `userReports_reportedUserId_idx` ON `userReports` (`reportedUserId`);--> statement-breakpoint
CREATE INDEX `userReports_reporterUserId_idx` ON `userReports` (`reporterUserId`);--> statement-breakpoint
CREATE INDEX `userReports_status_idx` ON `userReports` (`status`);--> statement-breakpoint
CREATE INDEX `userReports_createdAt_idx` ON `userReports` (`createdAt`);