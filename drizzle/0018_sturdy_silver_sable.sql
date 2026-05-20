ALTER TABLE `userProfiles` ADD `connectedAccounts` text;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `showProfile` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `hideInventoryValue` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `receiveContactRequests` boolean DEFAULT true NOT NULL;