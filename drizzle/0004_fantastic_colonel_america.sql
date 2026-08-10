ALTER TABLE `users` ADD `isMerchant` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `merchantVerified` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `merchantVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `merchantVerifiedBy` int;