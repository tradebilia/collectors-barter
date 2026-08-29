-- Approved external cash-adjustment expansion only. No unrelated schema drift is applied.
ALTER TABLE `users` ADD `venmoUsername` varchar(80);
--> statement-breakpoint
ALTER TABLE `users` ADD `cashAppCashtag` varchar(80);
--> statement-breakpoint
ALTER TABLE `users` ADD `zelleEmail` varchar(320);
--> statement-breakpoint
ALTER TABLE `users` ADD `zellePhone` varchar(32);
--> statement-breakpoint
ALTER TABLE `users` ADD `externalPaymentMethodsUpdatedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tradePayments` MODIFY COLUMN `paypalEmail` varchar(320);
--> statement-breakpoint
ALTER TABLE `tradePayments` ADD `paymentMethod` enum('paypal','venmo','cash_app','zelle');
--> statement-breakpoint
ALTER TABLE `tradePayments` ADD `paymentIdentifier` varchar(320);
--> statement-breakpoint
ALTER TABLE `tradePayments` ADD `paymentMethodSelectedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tradePayments` MODIFY COLUMN `status` enum('pending','method_selected','sent','received','disputed','submitted','verified','failed') NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `tradePayments` ADD `sentAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tradePayments` ADD `receivedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tradePayments` ADD `disputeOpenedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tradePayments` ADD `disputeOpenedBy` int;
--> statement-breakpoint
ALTER TABLE `tradePayments` ADD `disputeReason` varchar(500);
--> statement-breakpoint
ALTER TABLE `tradeActivityLog` MODIFY COLUMN `eventType` enum('trade_created','partner_joined','item_added','item_removed','cash_added','cash_removed','proposal_sent','proposal_accepted','proposal_declined','trade_cancelled','tracking_submitted','items_received','trade_completed','payment_step_started','payment_verification_started','payment_verified','payment_verification_failed','cash_payment_method_selected','cash_payment_marked_sent','cash_payment_received_confirmed','cash_payment_dispute_opened','cash_payment_terms_reset') NOT NULL;
