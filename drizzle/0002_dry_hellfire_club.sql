ALTER TABLE `ad_campaigns` MODIFY COLUMN `slot` enum('home_top','catalog_top','series_mid','reader_top','reader_bottom','reader_interstitial') NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_campaigns` ADD `cooldown_minutes` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_campaigns` ADD `close_delay_seconds` int DEFAULT 3 NOT NULL;