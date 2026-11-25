CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	`impersonated_by` text,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`role` text,
	`banned` boolean DEFAULT false,
	`ban_reason` text,
	`ban_expires` timestamp(3),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chapter_panels` (
	`id` char(36) NOT NULL,
	`chapter_id` char(36) NOT NULL,
	`media_id` char(36) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `chapter_panels_id` PRIMARY KEY(`id`),
	CONSTRAINT `chapter_panels_chapter_pos_uq` UNIQUE(`chapter_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` char(36) NOT NULL,
	`series_id` char(36) NOT NULL,
	`public_id` varchar(120) NOT NULL,
	`source` varchar(64),
	`external_id` varchar(120),
	`chapter_number` decimal(10,2) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`title` varchar(255) NOT NULL DEFAULT '',
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`is_synthetic` boolean NOT NULL DEFAULT false,
	`admin_edited_at` timestamp(3),
	`published_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`),
	CONSTRAINT `chapters_public_id_unique` UNIQUE(`public_id`),
	CONSTRAINT `chapters_source_external_uq` UNIQUE(`source`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` char(36) NOT NULL,
	`kind` enum('cover','panel') NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`mime_type` varchar(64) NOT NULL,
	`byte_size` int unsigned NOT NULL,
	`width` int unsigned NOT NULL,
	`height` int unsigned NOT NULL,
	`sha256` char(64) NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_assets_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` char(36) NOT NULL,
	`public_id` varchar(120) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`source` varchar(64),
	`external_id` varchar(120),
	`title` varchar(255) NOT NULL,
	`type` enum('Manhwa','Manhua','Manga') NOT NULL DEFAULT 'Manhwa',
	`genre` varchar(80) NOT NULL DEFAULT 'Action',
	`publication_status` enum('Ongoing','Completed','Hiatus') NOT NULL DEFAULT 'Ongoing',
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`rank` int NOT NULL DEFAULT 0,
	`followers` int NOT NULL DEFAULT 0,
	`rating` decimal(3,1) NOT NULL DEFAULT '0.0',
	`summary` text NOT NULL,
	`updated_label` varchar(64),
	`latest_chapter_number` decimal(10,2),
	`cover_media_id` char(36),
	`external_cover_url` varchar(512),
	`admin_edited_at` timestamp(3),
	`archived_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `series_id` PRIMARY KEY(`id`),
	CONSTRAINT `series_public_id_unique` UNIQUE(`public_id`),
	CONSTRAINT `series_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `series_source_external_uq` UNIQUE(`source`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `user_bookmarks` (
	`user_id` varchar(36) NOT NULL,
	`series_id` char(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_bookmarks_user_id_series_id_pk` PRIMARY KEY(`user_id`,`series_id`)
);
--> statement-breakpoint
CREATE TABLE `user_history` (
	`id` char(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`series_id` char(36) NOT NULL,
	`chapter_id` char(36) NOT NULL,
	`progress_percent` tinyint unsigned NOT NULL DEFAULT 100,
	`read_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_history_user_chapter_uq` UNIQUE(`user_id`,`chapter_id`)
);
--> statement-breakpoint
CREATE TABLE `user_queue` (
	`user_id` varchar(36) NOT NULL,
	`series_id` char(36) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_queue_user_id_series_id_pk` PRIMARY KEY(`user_id`,`series_id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapter_panels` ADD CONSTRAINT `chapter_panels_chapter_id_chapters_id_fk` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapter_panels` ADD CONSTRAINT `chapter_panels_media_id_media_assets_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_series_id_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `series` ADD CONSTRAINT `series_cover_media_id_media_assets_id_fk` FOREIGN KEY (`cover_media_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_bookmarks` ADD CONSTRAINT `user_bookmarks_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_bookmarks` ADD CONSTRAINT `user_bookmarks_series_id_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_history` ADD CONSTRAINT `user_history_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_history` ADD CONSTRAINT `user_history_series_id_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_history` ADD CONSTRAINT `user_history_chapter_id_chapters_id_fk` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_queue` ADD CONSTRAINT `user_queue_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_queue` ADD CONSTRAINT `user_queue_series_id_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `chapter_panels_media_idx` ON `chapter_panels` (`media_id`);--> statement-breakpoint
CREATE INDEX `chapters_series_status_order_idx` ON `chapters` (`series_id`,`status`,`sort_order`,`chapter_number`);--> statement-breakpoint
CREATE INDEX `media_assets_kind_idx` ON `media_assets` (`kind`);--> statement-breakpoint
CREATE INDEX `series_status_updated_idx` ON `series` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `series_status_type_idx` ON `series` (`status`,`type`);--> statement-breakpoint
CREATE INDEX `series_status_genre_idx` ON `series` (`status`,`genre`);--> statement-breakpoint
CREATE INDEX `series_status_rating_idx` ON `series` (`status`,`rating`);--> statement-breakpoint
CREATE INDEX `series_cover_media_idx` ON `series` (`cover_media_id`);--> statement-breakpoint
CREATE INDEX `user_bookmarks_user_created_idx` ON `user_bookmarks` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `user_history_user_read_idx` ON `user_history` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `user_history_user_series_idx` ON `user_history` (`user_id`,`series_id`);--> statement-breakpoint
CREATE INDEX `user_queue_user_pos_idx` ON `user_queue` (`user_id`,`position`);