-- P0 schema-boundary migration: apply through the approved migration process only.
-- This file replaces request-time enum alteration; it is intentionally not executed by application code.
ALTER TABLE `listings`
  MODIFY COLUMN `category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','music','autographs','disney_pins') NOT NULL;
--> statement-breakpoint
ALTER TABLE `conventions`
  MODIFY COLUMN `category` enum('comics','sports_cards','vintage_toys','video_games','stamps','coins','pokemon','movies','music','autographs','disney_pins','all') NOT NULL DEFAULT 'all';
