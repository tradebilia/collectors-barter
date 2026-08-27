-- Approved account-closure workflow: additive state only.
-- This migration never deletes accounts, listings, trades, reports, messages, or evidence.
ALTER TABLE `users` ADD COLUMN `isAccountClosed` tinyint NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `accountClosedAt` timestamp NULL;

CREATE TABLE `accountClosureRequests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `status` enum('pending_review','closed','declined','withdrawn') NOT NULL DEFAULT 'pending_review',
  `activeRequestKey` varchar(96) NULL,
  `memberNote` text NULL,
  `blockerSummary` text NULL,
  `adminNote` text NULL,
  `reviewedBy` int NULL,
  `requestedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewedAt` timestamp NULL,
  `closedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `accountClosureRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `accountClosureRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users` (`id`),
  UNIQUE KEY `accountClosureRequests_activeRequestKey_unique` (`activeRequestKey`),
  KEY `accountClosureRequests_userId_idx` (`userId`),
  KEY `accountClosureRequests_status_idx` (`status`),
  KEY `accountClosureRequests_requestedAt_idx` (`requestedAt`)
);
