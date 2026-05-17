ALTER TABLE `listings` ADD `grade` enum('ungraded','1','1.5','2','2.5','3','3.5','4','4.5','5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10') DEFAULT 'ungraded' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `certificationCompany` varchar(50);--> statement-breakpoint
ALTER TABLE `listings` ADD `estimatedValue` decimal(12,2);