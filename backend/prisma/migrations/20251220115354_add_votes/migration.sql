-- AlterTable
ALTER TABLE `User` ADD COLUMN `identity_verified` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `Invite` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `poll_id` BIGINT NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Invite_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vote` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `poll_id` BIGINT NOT NULL,
    `poll_config_id` BIGINT NOT NULL,
    `user_id` BIGINT NULL,
    `invite_id` BIGINT NULL,
    `response` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Vote_poll_id_user_id_key`(`poll_id`, `user_id`),
    UNIQUE INDEX `Vote_poll_id_invite_id_key`(`poll_id`, `invite_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Invite` ADD CONSTRAINT `Invite_poll_id_fkey` FOREIGN KEY (`poll_id`) REFERENCES `Poll`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_poll_id_fkey` FOREIGN KEY (`poll_id`) REFERENCES `Poll`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_poll_config_id_fkey` FOREIGN KEY (`poll_config_id`) REFERENCES `PollConfig`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_invite_id_fkey` FOREIGN KEY (`invite_id`) REFERENCES `Invite`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
