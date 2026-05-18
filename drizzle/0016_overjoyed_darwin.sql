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
CREATE INDEX `emailVerificationOtps_email_idx` ON `emailVerificationOtps` (`email`);--> statement-breakpoint
CREATE INDEX `emailVerificationOtps_expiresAt_idx` ON `emailVerificationOtps` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `phoneVerificationOtps_phone_idx` ON `phoneVerificationOtps` (`phone`);--> statement-breakpoint
CREATE INDEX `phoneVerificationOtps_expiresAt_idx` ON `phoneVerificationOtps` (`expiresAt`);