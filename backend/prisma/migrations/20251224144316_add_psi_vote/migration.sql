-- AlterTable
ALTER TABLE `Profile` ADD COLUMN `about` TEXT NULL,
    ADD COLUMN `photo_url` VARCHAR(1024) NULL;

-- CreateTable
CREATE TABLE `PsiVote` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `profile_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `weight` DOUBLE NOT NULL,
    `trust` DOUBLE NOT NULL,
    `performance` DOUBLE NOT NULL,
    `responsiveness` DOUBLE NOT NULL,
    `leadership` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PsiVote_profile_id_user_id_key`(`profile_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PsiVote` ADD CONSTRAINT `PsiVote_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PsiVote` ADD CONSTRAINT `PsiVote_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
