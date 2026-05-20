DROP TABLE `draftListings`;--> statement-breakpoint
DROP TABLE `emailVerificationOtps`;--> statement-breakpoint
DROP TABLE `passwordResetTokens`;--> statement-breakpoint
DROP TABLE `phoneVerificationOtps`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_username_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `isActive`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `firstName`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `lastName`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `contactTown`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `contactState`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `contactZipCode`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `contactCountry`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `acceptedTerms`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `isMerchant`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `securityQuestion`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `securityAnswer`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `preferredCategories`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `notificationPreferences`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `connectedAccounts`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `showProfile`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `hideInventoryValue`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `receiveContactRequests`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `emailVerified`;--> statement-breakpoint
ALTER TABLE `userProfiles` DROP COLUMN `phoneVerified`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `username`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `passwordHash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `displayName`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `avatarUrl`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `securityQuestion`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `securityAnswerHash`;