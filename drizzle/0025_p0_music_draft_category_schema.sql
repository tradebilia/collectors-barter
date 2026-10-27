-- Approved additive repair: allow the existing Music category in saved drafts.
-- This migration changes only the draftListings category enum; it deletes no data.
ALTER TABLE `draftListings`
  MODIFY COLUMN `category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','music','autographs','disney_pins') NOT NULL;
