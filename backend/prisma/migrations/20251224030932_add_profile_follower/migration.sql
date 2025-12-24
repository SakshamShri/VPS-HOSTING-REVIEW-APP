/*
  Warnings:

  - A unique constraint covering the columns `[domain,name_en]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Category_name_en_key` ON `Category`;

-- AlterTable
ALTER TABLE `Category` ADD COLUMN `claim_requirements` JSON NULL,
    ADD COLUMN `domain` ENUM('POLL', 'PROFILE') NOT NULL DEFAULT 'POLL',
    ADD COLUMN `profile_admin_curated` ENUM('FULL', 'PARTIAL', 'NONE') NULL,
    ADD COLUMN `profile_claimable` ENUM('YES', 'NO') NULL,
    ADD COLUMN `profile_level` ENUM('ROOT', 'SUB', 'PROFILE_PARENT') NULL,
    ADD COLUMN `profile_request_allowed` ENUM('YES', 'NO') NULL,
    ADD COLUMN `request_requirements` JSON NULL;

-- CreateTable
CREATE TABLE `Profile` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category_id` BIGINT NOT NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `is_claimed` BOOLEAN NOT NULL DEFAULT false,
    `claimed_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Profile_category_id_name_key`(`category_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileClaim` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `profile_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `submitted_data` JSON NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by_admin_id` BIGINT NULL,
    `review_reason` TEXT NULL,

    UNIQUE INDEX `ProfileClaim_profile_id_user_id_status_key`(`profile_id`, `user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileRequest` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `parent_category_id` BIGINT NOT NULL,
    `requested_name` VARCHAR(191) NOT NULL,
    `user_id` BIGINT NOT NULL,
    `submitted_data` JSON NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `approved_profile_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by_admin_id` BIGINT NULL,
    `review_reason` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileSubmissionDocument` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `claim_id` BIGINT NULL,
    `request_id` BIGINT NULL,
    `field_key` VARCHAR(191) NOT NULL,
    `original_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `storage_path` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileFollower` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `profile_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProfileFollower_profile_id_user_id_key`(`profile_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Category_domain_name_en_key` ON `Category`(`domain`, `name_en`);

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_claimed_by_user_id_fkey` FOREIGN KEY (`claimed_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileClaim` ADD CONSTRAINT `ProfileClaim_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileClaim` ADD CONSTRAINT `ProfileClaim_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileClaim` ADD CONSTRAINT `ProfileClaim_reviewed_by_admin_id_fkey` FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `AdminCredentials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileRequest` ADD CONSTRAINT `ProfileRequest_parent_category_id_fkey` FOREIGN KEY (`parent_category_id`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileRequest` ADD CONSTRAINT `ProfileRequest_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileRequest` ADD CONSTRAINT `ProfileRequest_approved_profile_id_fkey` FOREIGN KEY (`approved_profile_id`) REFERENCES `Profile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileRequest` ADD CONSTRAINT `ProfileRequest_reviewed_by_admin_id_fkey` FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `AdminCredentials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileSubmissionDocument` ADD CONSTRAINT `ProfileSubmissionDocument_claim_id_fkey` FOREIGN KEY (`claim_id`) REFERENCES `ProfileClaim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileSubmissionDocument` ADD CONSTRAINT `ProfileSubmissionDocument_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `ProfileRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileFollower` ADD CONSTRAINT `ProfileFollower_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileFollower` ADD CONSTRAINT `ProfileFollower_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
