import {MigrationInterface, QueryRunner} from '@sora-soft/database-component/typeorm';

export class BusinessDatabase1716902946308 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `auth_group` (`id` varchar(36) NOT NULL, `name` varchar(64) NOT NULL, `protected` tinyint NOT NULL DEFAULT 0, `createTime` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB AUTO_INCREMENT=1000');
    await queryRunner.query('CREATE TABLE `auth_permission` (`gid` varchar(255) NOT NULL, `name` varchar(64) NOT NULL, `permission` int NOT NULL DEFAULT \'2\', PRIMARY KEY (`gid`, `name`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `account_token` (`session` varchar(255) NOT NULL, `expireAt` int NOT NULL, `accountId` int NOT NULL, INDEX `expireAt_idx` (`expireAt`), INDEX `accountId_idx` (`accountId`), PRIMARY KEY (`session`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `account_login` (`id` int NOT NULL, `type` int NOT NULL, `username` varchar(64) NOT NULL, `password` varchar(128) NOT NULL, `salt` varchar(64) NOT NULL, UNIQUE INDEX `type_username_idx` (`type`, `username`), PRIMARY KEY (`id`, `type`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `account` (`id` int NOT NULL AUTO_INCREMENT, `nickname` varchar(64) NULL, `avatar` text NULL, `createTime` int NOT NULL, `lastLoginTime` int NOT NULL, `disabled` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB AUTO_INCREMENT=1000');
    await queryRunner.query('CREATE TABLE `account_auth_group` (`accountId` int NOT NULL, `groupId` varchar(36) NOT NULL, INDEX `IDX_df6873242d7ce56e52a05fc0e5` (`groupId`), INDEX `IDX_82353795ba05400818e15bc26b` (`accountId`), PRIMARY KEY (`accountId`, `groupId`)) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `auth_permission` ADD CONSTRAINT `FK_639efba05169768b15cb2d39a0c` FOREIGN KEY (`gid`) REFERENCES `auth_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE `account_auth_group` ADD CONSTRAINT `FK_82353795ba05400818e15bc26b8` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE');
    await queryRunner.query('ALTER TABLE `account_auth_group` ADD CONSTRAINT `FK_df6873242d7ce56e52a05fc0e57` FOREIGN KEY (`groupId`) REFERENCES `auth_group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `account_auth_group` DROP FOREIGN KEY `FK_df6873242d7ce56e52a05fc0e57`');
    await queryRunner.query('ALTER TABLE `account_auth_group` DROP FOREIGN KEY `FK_82353795ba05400818e15bc26b8`');
    await queryRunner.query('ALTER TABLE `auth_permission` DROP FOREIGN KEY `FK_639efba05169768b15cb2d39a0c`');
    await queryRunner.query('DROP INDEX `IDX_82353795ba05400818e15bc26b` ON `account_auth_group`');
    await queryRunner.query('DROP INDEX `IDX_df6873242d7ce56e52a05fc0e5` ON `account_auth_group`');
    await queryRunner.query('DROP TABLE `account_auth_group`');
    await queryRunner.query('DROP TABLE `account`');
    await queryRunner.query('DROP INDEX `type_username_idx` ON `account_login`');
    await queryRunner.query('DROP TABLE `account_login`');
    await queryRunner.query('DROP INDEX `accountId_idx` ON `account_token`');
    await queryRunner.query('DROP INDEX `expireAt_idx` ON `account_token`');
    await queryRunner.query('DROP TABLE `account_token`');
    await queryRunner.query('DROP TABLE `auth_permission`');
    await queryRunner.query('DROP TABLE `auth_group`');
  }
}
