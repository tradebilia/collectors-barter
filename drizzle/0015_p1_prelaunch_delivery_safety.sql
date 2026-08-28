-- This migration is additive only. It creates a local retry-safety ledger and
-- does not modify subscribers, broadcasts, marketplace records, or provider data.
CREATE TABLE `preLaunchBroadcastDeliveries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deliveryKey` varchar(96) NOT NULL,
  `requestedBy` int NOT NULL,
  `payloadHash` varchar(64) NOT NULL,
  `subject` varchar(160) NOT NULL,
  `recipientCount` int NULL,
  `broadcastId` varchar(128) NULL,
  `status` enum('prepared','sending','sent','uncertain') NOT NULL DEFAULT 'prepared',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `preLaunchBroadcastDeliveries_requestedBy_users_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users` (`id`),
  UNIQUE KEY `preLaunchBroadcastDeliveries_deliveryKey_unique` (`deliveryKey`),
  KEY `preLaunchBroadcastDeliveries_requestedBy_idx` (`requestedBy`),
  KEY `preLaunchBroadcastDeliveries_status_idx` (`status`),
  KEY `preLaunchBroadcastDeliveries_createdAt_idx` (`createdAt`)
);
