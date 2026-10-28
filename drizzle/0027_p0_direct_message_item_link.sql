-- Approved additive repair for the remaining direct-message schema drift.
-- Adds the nullable item linkage already declared by drizzle/schema.ts.
-- Existing direct-message threads remain valid because itemId is nullable.

ALTER TABLE `directMessageThreads`
  ADD COLUMN `itemId` int NULL AFTER `participantBId`;

ALTER TABLE `directMessageThreads`
  ADD CONSTRAINT `directMessageThreads_itemId_listings_id_fk`
  FOREIGN KEY (`itemId`) REFERENCES `listings`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX `dmThreads_itemId_idx` ON `directMessageThreads` (`itemId`);
