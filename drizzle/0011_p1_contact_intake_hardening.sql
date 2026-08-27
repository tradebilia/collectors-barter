-- P1 public contact intake hardening for the restored custom TiDB runtime.
-- New anonymous tickets have a NULL account association and explicit submitter fields.
-- Existing support-ticket records are intentionally left unchanged.

ALTER TABLE `supportTickets` MODIFY COLUMN `userId` int NULL;
ALTER TABLE `supportTickets` ADD COLUMN `submittedByName` varchar(100) NULL AFTER `userId`;
ALTER TABLE `supportTickets` ADD COLUMN `submittedByEmail` varchar(320) NULL AFTER `submittedByName`;
