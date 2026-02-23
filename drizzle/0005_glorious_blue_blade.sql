CREATE TABLE `content_item_seen` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content_item_id` text NOT NULL,
	`seen_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_item_seen_user_item_idx` ON `content_item_seen` (`user_id`,`content_item_id`);--> statement-breakpoint
CREATE INDEX `content_item_seen_user_id_idx` ON `content_item_seen` (`user_id`);