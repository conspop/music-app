ALTER TABLE `artists` ADD `spotify_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `artists_spotify_id_idx` ON `artists` (`spotify_id`);