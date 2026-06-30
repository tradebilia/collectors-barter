ALTER TABLE `draftListings` MODIFY COLUMN `grade` varchar(50) NOT NULL DEFAULT 'ungraded';--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `grade` varchar(50) NOT NULL DEFAULT 'ungraded';