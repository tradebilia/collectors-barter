-- Approved for cash-only negotiations: a proposal may no longer have an
-- original requested listing after both members negotiate all physical items out.
ALTER TABLE `tradeProposals` MODIFY COLUMN `requestedListingId` INT NULL;
