-- CreateTable
CREATE TABLE `PollConfig` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'DISABLED') NOT NULL DEFAULT 'DRAFT',
    `category_id` BIGINT NOT NULL,
    `ui_template` ENUM('STANDARD_LIST', 'YES_NO', 'RATING', 'SWIPE', 'POINT_ALLOC', 'MEDIA_COMPARE') NOT NULL,
    `theme` JSON NOT NULL,
    `rules` JSON NOT NULL,
    `permissions` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PollConfig_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PollConfig` ADD CONSTRAINT `PollConfig_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
