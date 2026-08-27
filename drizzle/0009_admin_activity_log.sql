-- Custom TiDB runtime addition for the approved administrator audit trail.
-- This is additive and idempotent. It records only administrator identity,
-- action category, generic target reference, and a non-sensitive summary.

CREATE TABLE IF NOT EXISTS `adminActivityLog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adminId` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `targetType` varchar(80) NOT NULL,
  `targetReference` varchar(120) NULL,
  `summary` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `adminActivityLog_admin_idx` (`adminId`),
  KEY `adminActivityLog_target_idx` (`targetType`, `targetReference`),
  KEY `adminActivityLog_action_idx` (`action`),
  KEY `adminActivityLog_createdAt_idx` (`createdAt`)
);
