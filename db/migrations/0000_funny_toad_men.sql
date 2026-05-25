CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`ip_hash` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_time_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_drive_id` text,
	`hiring_role` text,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_slug_idx` ON `companies` (`slug`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`oa_set_id` text NOT NULL,
	`drive_file_id` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`display_name` text NOT NULL,
	`kind` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`uploaded_by` text,
	`show_attribution` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`report_count` integer DEFAULT 0 NOT NULL,
	`rejection_reason` text,
	`uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`oa_set_id`) REFERENCES `oa_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `files_oa_idx` ON `files` (`oa_set_id`);--> statement-breakpoint
CREATE INDEX `files_uploader_idx` ON `files` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `files_status_idx` ON `files` (`status`);--> statement-breakpoint
CREATE TABLE `oa_set_tags` (
	`oa_set_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`oa_set_id`, `tag_id`),
	FOREIGN KEY (`oa_set_id`) REFERENCES `oa_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oa_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`conducted_for_batch` integer,
	`difficulty` text,
	`duration_min` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `oa_sets_company_idx` ON `oa_sets` (`company_id`);--> statement-breakpoint
CREATE INDEX `oa_sets_year_idx` ON `oa_sets` (`year`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reports_file_idx` ON `reports` (`file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reports_unique_reporter` ON `reports` (`file_id`,`reporter_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'topic' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_idx` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`picture` text,
	`role` text DEFAULT 'student' NOT NULL,
	`branch` text,
	`batch_year` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_login_at` integer,
	`is_blocked` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `view_tokens` (
	`jti` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade
);
