CREATE TABLE `listing_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apartmentId` int NOT NULL,
	`reason` enum('unavailable','wrong_details','suspicious','other') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listing_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `apartments` MODIFY COLUMN `status` enum('draft','pending_review','published','rejected','archived') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `apartments` ADD `isSublease` boolean;--> statement-breakpoint
ALTER TABLE `apartments` ADD `subleaseEndDate` timestamp;--> statement-breakpoint
ALTER TABLE `apartments` ADD `wechatContact` varchar(100);