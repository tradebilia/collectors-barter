ALTER TABLE `userProfiles` ADD `acceptedTerms` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `isMerchant` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `securityQuestion` varchar(255);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `securityAnswer` varchar(255);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `preferredCategories` text;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `notificationPreferences` text;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `phoneVerified` boolean DEFAULT false NOT NULL;