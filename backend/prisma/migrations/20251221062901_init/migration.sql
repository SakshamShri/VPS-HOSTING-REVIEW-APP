-- AlterTable
ALTER TABLE `UserPoll` ADD COLUMN `category_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `UserPoll` ADD CONSTRAINT `UserPoll_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
