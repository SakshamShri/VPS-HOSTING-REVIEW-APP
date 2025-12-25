-- AlterTable
ALTER TABLE `UserInviteGroupMember` ADD COLUMN `bio` TEXT NULL,
    ADD COLUMN `name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `UserPollOption` ADD COLUMN `image_url` TEXT NULL;
