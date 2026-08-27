-- P1 data-integrity repair for the restored custom TiDB runtime.
-- Preconditions: duplicate-group checks must return zero before this migration runs.
-- This migration changes only indexes; it neither reads nor modifies marketplace records.

ALTER TABLE `users` ADD UNIQUE INDEX `users_username_unique` (`username`);
ALTER TABLE `userProfiles` ADD UNIQUE INDEX `userProfiles_userId_unique` (`userId`);
ALTER TABLE `userReports` ADD UNIQUE INDEX `userReports_reportId_unique` (`reportId`);
ALTER TABLE `watchlistEntries` ADD UNIQUE INDEX `watchlistEntries_unique_user_listing` (`userId`, `listingId`);
ALTER TABLE `favorites` ADD UNIQUE INDEX `favorites_user_listing_unique` (`userId`, `listingId`);
