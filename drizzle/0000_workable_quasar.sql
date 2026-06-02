DROP TABLE `deletedAccounts`;--> statement-breakpoint
DROP TABLE `draftListings`;--> statement-breakpoint
DROP TABLE `ebayFeedbackHistory`;--> statement-breakpoint
DROP TABLE `emailVerificationOtps`;--> statement-breakpoint
DROP TABLE `listingPhotos`;--> statement-breakpoint
DROP TABLE `listings`;--> statement-breakpoint
DROP TABLE `lowFeedbackFlags`;--> statement-breakpoint
DROP TABLE `passwordResetTokens`;--> statement-breakpoint
DROP TABLE `phoneVerificationOtps`;--> statement-breakpoint
DROP TABLE `tradeMessages`;--> statement-breakpoint
DROP TABLE `tradeProposalItems`;--> statement-breakpoint
DROP TABLE `tradeProposals`;--> statement-breakpoint
DROP TABLE `tradeReviews`;--> statement-breakpoint
DROP TABLE `userProfiles`;--> statement-breakpoint
DROP TABLE `userReports`;--> statement-breakpoint
DROP TABLE `watchlistEntries`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_username_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `username`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `passwordHash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `displayName`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `avatarUrl`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `securityQuestion`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `securityAnswerHash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `lastActivityAt`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayUsername`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayUserId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayFeedbackScore`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayFeedbackPercentage`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayMemberSince`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayConnectedAt`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayAccessToken`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayRefreshToken`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ebayTokenExpiresAt`;