CREATE TABLE `membershipProviderEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(32) NOT NULL,
	`providerEventId` varchar(255) NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`processedAt` timestamp,
	`processingStatus` enum('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipProviderEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `membershipProviderEvents_unique` UNIQUE(`provider`,`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `verificationOrderShipments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`verificationOrderId` int NOT NULL,
	`memberId` int NOT NULL,
	`direction` enum('to_tradebilia','to_member') NOT NULL,
	`trackingNumber` varchar(255),
	`carrier` varchar(80),
	`receivedAt` timestamp,
	`forwardedAt` timestamp,
	`evidenceUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verificationOrderShipments_id` PRIMARY KEY(`id`),
	CONSTRAINT `verificationOrderShipments_order_member_direction_unique` UNIQUE(`verificationOrderId`,`memberId`,`direction`)
);
--> statement-breakpoint
CREATE TABLE `verificationOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`status` enum('awaiting_agreement','awaiting_payment','awaiting_shipment','received','matched_listing','forwarded','completed','admin_review','cancelled') NOT NULL DEFAULT 'awaiting_agreement',
	`requesterAgreed` tinyint NOT NULL DEFAULT 0,
	`recipientAgreed` tinyint NOT NULL DEFAULT 0,
	`requesterPaymentStatus` enum('not_required','unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid',
	`recipientPaymentStatus` enum('not_required','unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid',
	`feeCentsPerMember` int NOT NULL DEFAULT 2000,
	`requesterPaymentReference` varchar(255),
	`recipientPaymentReference` varchar(255),
	`shipByAt` timestamp,
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verificationOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `verificationOrders_proposal_unique` UNIQUE(`proposalId`)
);
--> statement-breakpoint
ALTER TABLE `membershipPlans` RENAME COLUMN `stripePriceId` TO `stripeMonthlyPriceId`;--> statement-breakpoint
UPDATE `billingSettings` SET `billingMode` = 'membership_required' WHERE `billingMode` = 'subscription';--> statement-breakpoint
ALTER TABLE `billingSettings` MODIFY COLUMN `billingMode` enum('free_launch','launch_grace','membership_required') NOT NULL DEFAULT 'free_launch';--> statement-breakpoint
UPDATE `userMemberships` SET `status` = 'active' WHERE `status` = 'trialing';--> statement-breakpoint
ALTER TABLE `userMemberships` MODIFY COLUMN `status` enum('free_launch','active','past_due','cancelled','complimentary','unpaid') NOT NULL DEFAULT 'free_launch';--> statement-breakpoint
ALTER TABLE `billingSettings` ADD `paymentEnforcementEnabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `billingSettings` ADD `feeLaunchStartsAt` timestamp;--> statement-breakpoint
ALTER TABLE `billingSettings` ADD `feeLaunchGraceEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `membershipPlans` ADD `stripeAnnualPriceId` varchar(255);--> statement-breakpoint
ALTER TABLE `userMemberships` ADD `billingTerm` enum('none','monthly','annual','complimentary') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `userMemberships` ADD `paymentGraceEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `userMemberships` ADD `accessOverrideNote` text;--> statement-breakpoint
ALTER TABLE `verificationOrderShipments` ADD CONSTRAINT `verification_shipments_order_fk` FOREIGN KEY (`verificationOrderId`) REFERENCES `verificationOrders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verificationOrderShipments` ADD CONSTRAINT `verification_shipments_member_fk` FOREIGN KEY (`memberId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verificationOrders` ADD CONSTRAINT `verificationOrders_proposalId_tradeProposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `tradeProposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `membershipProviderEvents_status_idx` ON `membershipProviderEvents` (`processingStatus`);--> statement-breakpoint
CREATE INDEX `verificationOrderShipments_member_idx` ON `verificationOrderShipments` (`memberId`);--> statement-breakpoint
CREATE INDEX `verificationOrders_status_idx` ON `verificationOrders` (`status`);--> statement-breakpoint
CREATE INDEX `userMemberships_grace_idx` ON `userMemberships` (`paymentGraceEndsAt`);--> statement-breakpoint
UPDATE `membershipPlans` SET `code` = 'tradebilia_membership' WHERE `code` = 'subscription';--> statement-breakpoint
INSERT INTO `membershipPlans` (`code`, `name`, `description`, `billingInterval`, `isActive`, `isFreeLaunch`, `sortOrder`)
VALUES
  ('free_launch', 'Free Launch Access', 'All current Tradebilia features remain available while billing is inactive.', 'free', 1, 1, 0),
  ('tradebilia_membership', 'Tradebilia Membership', 'Future $1 monthly or $10 annual membership with identical access.', 'subscription', 1, 0, 10)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `isActive` = VALUES(`isActive`), `isFreeLaunch` = VALUES(`isFreeLaunch`), `sortOrder` = VALUES(`sortOrder`);--> statement-breakpoint
INSERT INTO `membershipFeatures` (`featureKey`, `name`, `description`, `category`, `defaultFreeLaunchEnabled`, `sortOrder`)
VALUES
  ('browse_marketplace', 'Browse marketplace', 'Browse the homepage, categories, and global search.', 'marketplace', 1, 10),
  ('view_item_details', 'View item details', 'Open individual listing detail pages.', 'marketplace', 1, 20),
  ('manage_inventory', 'Manage inventory', 'Create, edit, hide, and delete your own listings.', 'account', 1, 30),
  ('send_messages', 'Send messages', 'Send and receive direct messages and item inquiries.', 'trading', 1, 40),
  ('propose_trades', 'Propose and manage trades', 'Propose, accept, and complete collector trades.', 'trading', 1, 50),
  ('manage_billing', 'Manage billing', 'View membership status and manage future billing.', 'account', 1, 60),
  ('verification_forwarding', 'Verification & Forwarding Service', 'Optional future Tradebilia item verification and forwarding workflow.', 'services', 1, 70)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `category` = VALUES(`category`), `defaultFreeLaunchEnabled` = VALUES(`defaultFreeLaunchEnabled`), `sortOrder` = VALUES(`sortOrder`);--> statement-breakpoint
INSERT INTO `membershipPlanFeatures` (`planId`, `featureId`, `isEnabled`)
SELECT plan.id, feature.id, 1 FROM `membershipPlans` plan CROSS JOIN `membershipFeatures` feature
WHERE plan.code IN ('free_launch', 'tradebilia_membership')
ON DUPLICATE KEY UPDATE `isEnabled` = VALUES(`isEnabled`);--> statement-breakpoint
INSERT INTO `billingSettings` (`billingMode`, `stripeBillingEnabled`, `paymentEnforcementEnabled`)
SELECT 'free_launch', 0, 0 WHERE NOT EXISTS (SELECT 1 FROM `billingSettings`);
