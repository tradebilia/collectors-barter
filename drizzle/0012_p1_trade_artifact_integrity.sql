-- Second deep-audit P1 trade-artifact integrity repair for the custom TiDB runtime.
-- Preconditions verified 2026-08-27: one duplicate review group only; no duplicate
-- groups in notes, proposal items, receipt confirmations, tracking records, votes,
-- voting proposals, or voting tokens. The oldest review row is retained by ID.

DELETE newer
FROM `tradeReviews` AS older
JOIN `tradeReviews` AS newer
  ON newer.`proposalId` = older.`proposalId`
 AND newer.`reviewerId` = older.`reviewerId`
 AND newer.`id` > older.`id`;

ALTER TABLE `tradePrivateNotes`
  ADD UNIQUE INDEX `tradePrivateNotes_proposal_user_unique` (`proposalId`, `userId`);
ALTER TABLE `tradeProposalItems`
  ADD UNIQUE INDEX `tradeProposalItems_proposal_listing_unique` (`proposalId`, `offeredListingId`);
ALTER TABLE `tradeReceiptConfirmation`
  ADD UNIQUE INDEX `tradeReceiptConfirmation_proposal_user_unique` (`proposalId`, `userId`);
ALTER TABLE `tradeReviews`
  ADD UNIQUE INDEX `tradeReviews_proposal_reviewer_unique` (`proposalId`, `reviewerId`);
ALTER TABLE `tradeTrackingNumbers`
  ADD UNIQUE INDEX `tradeTrackingNumbers_proposal_user_listing_unique` (`proposalId`, `userId`, `listingId`);
ALTER TABLE `tradeVotes`
  ADD UNIQUE INDEX `tradeVotes_link_voter_unique` (`votingLinkId`, `voterUserId`);
ALTER TABLE `tradeVotingLinks`
  ADD UNIQUE INDEX `tradeVotingLinks_proposal_unique` (`proposalId`);
ALTER TABLE `tradeVotingLinks`
  ADD UNIQUE INDEX `tradeVotingLinks_token_unique` (`linkToken`);
