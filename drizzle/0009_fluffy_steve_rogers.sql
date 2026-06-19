-- Add itemType column as nullable first
ALTER TABLE `listings` ADD `itemType` varchar(50);

-- Populate existing listings with default itemType values based on category
UPDATE `listings` 
SET `itemType` = CASE 
  WHEN `category` = 'sports_cards' THEN 'single_card'
  WHEN `category` = 'pokemon' THEN 'single_card'
  WHEN `category` = 'comics' THEN 'single_comic'
  ELSE 'collection_lot'
END
WHERE `itemType` IS NULL;

-- Make itemType NOT NULL after populating
ALTER TABLE `listings` MODIFY `itemType` varchar(50) NOT NULL;

-- Create index on itemType
CREATE INDEX `listings_itemType_idx` ON `listings` (`itemType`);
