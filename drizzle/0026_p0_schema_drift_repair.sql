-- Approved additive repair for verified application/live-schema drift.
-- This migration preserves all existing rows and uses additive schema operations only.
-- tradePayments payer/payee physical names and tradePayments.status=disputed
-- were already correct during live preflight.

ALTER TABLE `conventionCategories`
  MODIFY COLUMN `category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','music','autographs','disney_pins','all') NOT NULL;

ALTER TABLE `tradePayments`
  MODIFY COLUMN `paymentMethod` enum('paypal','venmo','cash_app','zelle') NULL;

ALTER TABLE `tradeProposals`
  MODIFY COLUMN `status` enum('pending','negotiating','accepted','shipping','shipped','declined','completed','cancelled','frozen','disputed') NOT NULL DEFAULT 'pending';

ALTER TABLE `forumPosts`
  ADD COLUMN `subcategory` varchar(64) NULL,
  ADD COLUMN `listingId` int NULL,
  ADD COLUMN `status` enum('active','removed') NOT NULL DEFAULT 'active',
  ADD COLUMN `removedAt` timestamp NULL,
  ADD COLUMN `removedBy` int NULL,
  ADD COLUMN `removalReason` text NULL;

ALTER TABLE `forumReplies`
  ADD COLUMN `listingId` int NULL;

CREATE TABLE IF NOT EXISTS `forumReports` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `reporterId` int NOT NULL,
  `reason` varchar(80) NOT NULL,
  `details` text NULL,
  `status` enum('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
  `reviewedBy` int NULL,
  `reviewedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `forumReports_post_idx` (`postId`),
  KEY `forumReports_reporter_idx` (`reporterId`),
  KEY `forumReports_status_idx` (`status`)
);

CREATE TABLE IF NOT EXISTS `forumFollows` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forumFollows_post_user_unique` (`postId`, `userId`),
  KEY `forumFollows_user_idx` (`userId`)
);

CREATE TABLE IF NOT EXISTS `forumNotifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `postId` int NOT NULL,
  `replyId` int NULL,
  `kind` enum('topic_reply') NOT NULL,
  `isRead` tinyint NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `forumNotifications_user_read_idx` (`userId`, `isRead`),
  KEY `forumNotifications_post_idx` (`postId`)
);
