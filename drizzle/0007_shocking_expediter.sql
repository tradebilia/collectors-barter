CREATE TABLE `billingSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`billingMode` enum('free_launch','preview','live') NOT NULL DEFAULT 'free_launch',
	`stripeBillingEnabled` tinyint NOT NULL DEFAULT 0,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billingSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `membershipFeatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureKey` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`category` varchar(80) NOT NULL DEFAULT 'membership',
	`defaultFreeLaunchEnabled` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipFeatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `membershipFeatures_key_unique` UNIQUE(`featureKey`)
);
--> statement-breakpoint
CREATE TABLE `membershipPlanFeatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`featureId` int NOT NULL,
	`isEnabled` tinyint NOT NULL DEFAULT 1,
	`limitValue` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipPlanFeatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `membershipPlanFeatures_plan_feature_unique` UNIQUE(`planId`,`featureId`)
);
--> statement-breakpoint
CREATE TABLE `membershipPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`billingInterval` enum('free','month','year') NOT NULL DEFAULT 'free',
	`isActive` tinyint NOT NULL DEFAULT 1,
	`isFreeLaunch` tinyint NOT NULL DEFAULT 0,
	`stripePriceId` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `membershipPlans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `userMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('free_launch','trialing','active','past_due','cancelled','complimentary') NOT NULL DEFAULT 'free_launch',
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` tinyint NOT NULL DEFAULT 0,
	`freeLaunchGrantedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `userMemberships_user_unique` UNIQUE(`userId`),
	CONSTRAINT `userMemberships_stripeSubscription_unique` UNIQUE(`stripeSubscriptionId`)
);
--> statement-breakpoint
ALTER TABLE `billingSettings` ADD CONSTRAINT `billingSettings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membershipPlanFeatures` ADD CONSTRAINT `membershipPlanFeatures_planId_membershipPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `membershipPlans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membershipPlanFeatures` ADD CONSTRAINT `membershipPlanFeatures_featureId_membershipFeatures_id_fk` FOREIGN KEY (`featureId`) REFERENCES `membershipFeatures`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userMemberships` ADD CONSTRAINT `userMemberships_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userMemberships` ADD CONSTRAINT `userMemberships_planId_membershipPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `membershipPlans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `membershipFeatures_category_idx` ON `membershipFeatures` (`category`);--> statement-breakpoint
CREATE INDEX `membershipPlanFeatures_plan_idx` ON `membershipPlanFeatures` (`planId`);--> statement-breakpoint
CREATE INDEX `membershipPlanFeatures_feature_idx` ON `membershipPlanFeatures` (`featureId`);--> statement-breakpoint
CREATE INDEX `membershipPlans_active_idx` ON `membershipPlans` (`isActive`);--> statement-breakpoint
CREATE INDEX `userMemberships_plan_idx` ON `userMemberships` (`planId`);--> statement-breakpoint
CREATE INDEX `userMemberships_status_idx` ON `userMemberships` (`status`);