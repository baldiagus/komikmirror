CREATE TABLE `ad_campaigns` (
	`id` char(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`slot` enum('home_top','catalog_top','series_mid','reader_top','reader_bottom') NOT NULL,
	`ad_type` enum('banner','network') NOT NULL DEFAULT 'banner',
	`status` enum('draft','active','paused') NOT NULL DEFAULT 'draft',
	`priority` int NOT NULL DEFAULT 10,
	`hide_for_admin` boolean NOT NULL DEFAULT false,
	`desktop_media_id` char(36),
	`mobile_media_id` char(36),
	`image_alt` varchar(200) NOT NULL DEFAULT '',
	`target_url` varchar(512),
	`open_in_new_tab` boolean NOT NULL DEFAULT true,
	`network_code` text,
	`frame_height_desktop` int NOT NULL DEFAULT 100,
	`frame_height_mobile` int NOT NULL DEFAULT 100,
	`starts_at` timestamp(3),
	`ends_at` timestamp(3),
	`impressions` int unsigned NOT NULL DEFAULT 0,
	`clicks` int unsigned NOT NULL DEFAULT 0,
	`created_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `media_assets` MODIFY COLUMN `kind` enum('cover','panel','ad') NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_campaigns` ADD CONSTRAINT `ad_campaigns_desktop_media_id_media_assets_id_fk` FOREIGN KEY (`desktop_media_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ad_campaigns` ADD CONSTRAINT `ad_campaigns_mobile_media_id_media_assets_id_fk` FOREIGN KEY (`mobile_media_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ad_campaigns` ADD CONSTRAINT `ad_campaigns_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ad_campaigns_slot_status_idx` ON `ad_campaigns` (`slot`,`status`,`priority`);--> statement-breakpoint
CREATE INDEX `ad_campaigns_desktop_media_idx` ON `ad_campaigns` (`desktop_media_id`);--> statement-breakpoint
CREATE INDEX `ad_campaigns_mobile_media_idx` ON `ad_campaigns` (`mobile_media_id`);