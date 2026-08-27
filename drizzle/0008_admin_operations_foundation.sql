-- Custom TiDB runtime additions for existing approved administrator workflows.
-- Additive only: no seed data, data changes, deletes, or billing/member changes.

CREATE TABLE IF NOT EXISTS `accountApprovalReviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
  `reasonCode` varchar(80) NOT NULL,
  `emailFirstSeenAt` timestamp NULL,
  `adminNote` text NULL,
  `reviewedBy` int NULL,
  `reviewedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accountApprovalReviews_userId_unique` (`userId`),
  KEY `accountApprovalReviews_status_idx` (`status`),
  KEY `accountApprovalReviews_createdAt_idx` (`createdAt`),
  CONSTRAINT `accountApprovalReviews_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `accountApprovalReviews_reviewedBy_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users` (`id`)
);

CREATE TABLE IF NOT EXISTS `apiHealthEvents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider` varchar(80) NOT NULL,
  `operation` varchar(120) NOT NULL,
  `failureClass` enum('quota_exhausted','rate_limited','authentication','configuration','timeout','upstream','network','validation','unknown') NOT NULL,
  `statusCode` int NULL,
  `providerErrorCode` varchar(120) NULL,
  `safeMessage` varchar(255) NULL,
  `occurredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `apiHealthEvents_provider_idx` (`provider`),
  KEY `apiHealthEvents_failureClass_idx` (`failureClass`),
  KEY `apiHealthEvents_occurredAt_idx` (`occurredAt`)
);
