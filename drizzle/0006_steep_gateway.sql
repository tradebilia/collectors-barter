CREATE TABLE `apiHealthEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(80) NOT NULL,
	`operation` varchar(120) NOT NULL,
	`failureClass` enum('quota_exhausted','rate_limited','authentication','configuration','timeout','upstream','network','validation','unknown') NOT NULL,
	`statusCode` int,
	`providerErrorCode` varchar(120),
	`safeMessage` varchar(255),
	`occurredAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `apiHealthEvents_provider_idx` ON `apiHealthEvents` (`provider`);--> statement-breakpoint
CREATE INDEX `apiHealthEvents_failureClass_idx` ON `apiHealthEvents` (`failureClass`);--> statement-breakpoint
CREATE INDEX `apiHealthEvents_occurredAt_idx` ON `apiHealthEvents` (`occurredAt`);