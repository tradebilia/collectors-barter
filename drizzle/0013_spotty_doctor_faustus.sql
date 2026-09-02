CREATE TABLE `identityRegistry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identityType` enum('email','phone','ebay','facebook','linkedin','etsy') NOT NULL,
	`fingerprint` varchar(64) NOT NULL,
	`ownerUserId` int,
	`status` enum('active','restricted','review_required') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`restrictedAt` timestamp,
	`restrictedBy` int,
	CONSTRAINT `identityRegistry_type_fingerprint_unique` UNIQUE(`identityType`,`fingerprint`)
);
--> statement-breakpoint
CREATE INDEX `identityRegistry_ownerUserId_idx` ON `identityRegistry` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `identityRegistry_status_idx` ON `identityRegistry` (`status`);