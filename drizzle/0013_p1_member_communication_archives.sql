-- Second deep-audit P1 member-specific communication retention repair.
-- Existing shared inquiry deletions are conservatively preserved as archived for both
-- participants; no message or inquiry body is removed by this migration.

ALTER TABLE `itemInquiries` ADD COLUMN `senderArchivedAt` TIMESTAMP NULL;
ALTER TABLE `itemInquiries` ADD COLUMN `recipientArchivedAt` TIMESTAMP NULL;
ALTER TABLE `directMessageThreads` ADD COLUMN `participantAArchivedAt` TIMESTAMP NULL;
ALTER TABLE `directMessageThreads` ADD COLUMN `participantBArchivedAt` TIMESTAMP NULL;

UPDATE `itemInquiries`
SET `senderArchivedAt` = `deletedAt`, `recipientArchivedAt` = `deletedAt`
WHERE `deletedAt` IS NOT NULL;
