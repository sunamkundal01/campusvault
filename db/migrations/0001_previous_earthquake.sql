CREATE TABLE `oa_links` (
	`id` text PRIMARY KEY NOT NULL,
	`oa_set_id` text NOT NULL,
	`url` text NOT NULL,
	`label` text,
	`added_by` text,
	`show_attribution` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`oa_set_id`) REFERENCES `oa_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `oa_links_oa_idx` ON `oa_links` (`oa_set_id`);--> statement-breakpoint
CREATE INDEX `oa_links_status_idx` ON `oa_links` (`status`);