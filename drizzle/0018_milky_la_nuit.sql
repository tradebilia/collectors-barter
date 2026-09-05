ALTER TABLE `forumReplies` ADD `parentReplyId` int;--> statement-breakpoint
CREATE INDEX `forumReplies_parent_idx` ON `forumReplies` (`parentReplyId`);