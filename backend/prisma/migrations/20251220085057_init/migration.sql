-- CreateTable
CREATE TABLE `Category` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name_en` VARCHAR(191) NOT NULL,
    `name_local` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `is_parent` BOOLEAN NOT NULL,
    `parent_id` BIGINT NULL,
    `claimable_default` ENUM('YES', 'NO') NOT NULL,
    `request_allowed_default` ENUM('YES', 'NO') NOT NULL,
    `admin_curated_default` ENUM('YES', 'NO', 'PARTIAL') NOT NULL,
    `claimable` ENUM('YES', 'NO') NULL,
    `request_allowed` ENUM('YES', 'NO') NULL,
    `admin_curated` ENUM('YES', 'NO', 'PARTIAL') NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
