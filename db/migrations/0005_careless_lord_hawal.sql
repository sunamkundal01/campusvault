CREATE TABLE `interview_experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`company_id` text NOT NULL,
	`role` text,
	`college` text,
	`year` integer,
	`youtube_url` text,
	`youtube_video_id` text,
	`title` text,
	`content` text,
	`author_id` text,
	`author_name` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`report_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `interviews_company_idx` ON `interview_experiences` (`company_id`);--> statement-breakpoint
CREATE INDEX `interviews_kind_idx` ON `interview_experiences` (`kind`);--> statement-breakpoint
CREATE INDEX `interviews_status_idx` ON `interview_experiences` (`status`);--> statement-breakpoint
CREATE INDEX `interviews_created_idx` ON `interview_experiences` (`created_at`);