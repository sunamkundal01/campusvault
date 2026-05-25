ALTER TABLE `oa_sets` ADD `college` text;--> statement-breakpoint
CREATE INDEX `oa_sets_college_idx` ON `oa_sets` (`college`);