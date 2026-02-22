CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`artist_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`summary` text,
	`image_url` text,
	`confidence` real NOT NULL,
	`dedupe_hash` text NOT NULL,
	`published_at` integer,
	`event_date` integer,
	`event_venue` text,
	`event_city` text,
	`event_lat` real,
	`event_lng` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_dedupe_hash_idx` ON `content_items` (`dedupe_hash`);--> statement-breakpoint
CREATE INDEX `content_items_artist_id_idx` ON `content_items` (`artist_id`);--> statement-breakpoint
CREATE INDEX `content_items_type_idx` ON `content_items` (`type`);--> statement-breakpoint
CREATE INDEX `content_items_published_at_idx` ON `content_items` (`published_at`);--> statement-breakpoint
CREATE INDEX `content_items_event_date_idx` ON `content_items` (`event_date`);--> statement-breakpoint
CREATE TABLE `follows` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`artist_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `follows_user_artist_idx` ON `follows` (`user_id`,`artist_id`);--> statement-breakpoint
CREATE INDEX `follows_user_id_idx` ON `follows` (`user_id`);--> statement-breakpoint
CREATE INDEX `follows_artist_id_idx` ON `follows` (`artist_id`);--> statement-breakpoint
CREATE TABLE `ingestion_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`type` text NOT NULL,
	`ran_at` integer NOT NULL,
	`items_found` integer NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ingestion_runs_artist_type_idx` ON `ingestion_runs` (`artist_id`,`type`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`location_city` text,
	`location_region` text,
	`location_country` text,
	`location_lat` real,
	`location_lng` real,
	`location_radius_km` integer DEFAULT 50,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_idx` ON `users` (`google_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);