ALTER TABLE `listings` MODIFY COLUMN `category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','autographs','disney_pins') NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `contactFullName` varchar(160);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `contactEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `contactPhone` varchar(40);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `contactAddress` text;