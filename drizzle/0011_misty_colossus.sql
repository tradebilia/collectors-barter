ALTER TABLE `tradePayments` RENAME COLUMN `payerId` TO `payerUserId`;--> statement-breakpoint
-- The secured live Tradebilia database was verified to already use
-- `payerUserId` and `payeeUserId`. This migration intentionally performs no
-- database DDL and brings Drizzle metadata into line with the established schema.
