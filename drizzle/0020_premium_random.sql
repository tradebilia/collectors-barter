CREATE TABLE `tradeShowcaseVotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`voterId` int NOT NULL,
	`vote` enum('good','bad') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tradeShowcaseVotes_proposal_voter_unique` UNIQUE(`proposalId`,`voterId`)
);
--> statement-breakpoint
CREATE INDEX `tradeShowcaseVotes_proposal_idx` ON `tradeShowcaseVotes` (`proposalId`);--> statement-breakpoint
CREATE INDEX `tradeShowcaseVotes_voter_idx` ON `tradeShowcaseVotes` (`voterId`);