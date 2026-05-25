CREATE TABLE `placement_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`role` text NOT NULL,
	`college` text NOT NULL,
	`entry_type` text DEFAULT 'entry' NOT NULL,
	`oa_date` text,
	`ctc` text,
	`cgpa_criteria` text,
	`mtech_eligible` integer,
	`notes` text,
	`uploaded_by` text,
	`show_attribution` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`report_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `placement_company_idx` ON `placement_entries` (`company_id`);--> statement-breakpoint
CREATE INDEX `placement_college_idx` ON `placement_entries` (`college`);--> statement-breakpoint
CREATE INDEX `placement_status_idx` ON `placement_entries` (`status`);--> statement-breakpoint
CREATE INDEX `placement_created_idx` ON `placement_entries` (`created_at`);