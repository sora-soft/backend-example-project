import {Hash, Random} from '../../lib/Utility.js';
import {Com} from '../../lib/Com.js';
import {Account, AccountAuthGroup, AccountLogin, AccountToken} from '../database/Account.js';
import {AuthGroup, AuthPermission} from '../database/Auth.js';
import {AppErrorCode, UserErrorCode} from '../ErrorCode.js';
import {RedisKey} from '../Keys.js';
import {UserError} from '../UserError.js';
import {AccountId, AccountLoginType, AuthGroupId, DefaultGroupList, DefaultPermissionList, PermissionResult, RootGroupId} from './AccountType.js';
import {validate} from 'class-validator';
import {Application} from '../Application.js';
import {AccountLock} from './AccountLock.js';
import {ForgetPasswordEmail} from './AccountEmail.js';
import {NodeTime, UnixTime} from '@sora-soft/framework';
import {EntityManager, LessThan, Not, MoreThan, In} from '@sora-soft/database-component/typeorm';
import {transaction} from '../database/utility/Decorators.js';
import {v4 as uuid} from 'uuid';
import {AccountPermission} from './AccountPermission.js';
import {AppError} from '../AppError.js';

class AccountWorld {
  static async startup() {
    await this.loadDefaultGroup();
    await this.loadDefaultPermission();
  }

  static async shutdown() {}

  static async loadDefaultGroup() {
    const groups: AuthGroup [] = [];
    for (const data of DefaultGroupList) {
      const existed = await Com.businessDB.manager.findOneBy(AuthGroup, {id: data.id});
      if (existed)
        continue;

      const group = new AuthGroup(data);
      group.createTime = UnixTime.now();
      groups.push(group);
    }
    if (groups.length) {
      await Com.businessDB.manager.save(groups);
    }
  }

  static async loadDefaultPermission() {
    const permissions: AuthPermission[] = [];
    for (const data of DefaultPermissionList) {
      const permission = new AuthPermission(data);
      permissions.push(permission);
    }
    if (permissions.length) {
      await Com.businessDB.manager.save(permissions);
    }
  }

  static async getAccountSession(session: string): Promise<AccountToken | null> {
    return Com.businessDB.manager.findOneBy(AccountToken, {
      session,
      expireAt: MoreThan(UnixTime.now()),
    });
  }

  @transaction(Com.businessDB)
  static async setAccountSession(session: string, account: Account, expire: number = UnixTime.hour(8), manager?: EntityManager) {
    if (!manager)
      throw new AppError(AppErrorCode.ERR_TRANSACTION_FAILED, 'ERR_TRANSACTION_FAILED');
    return manager.save(new AccountToken({
      session,
      accountId: account.id,
      expireAt: UnixTime.now() + expire,
    }));
  }

  @transaction(Com.businessDB)
  static async deleteAccountSession(session: string, manager?: EntityManager) {
    if (!manager)
      throw new AppError(AppErrorCode.ERR_TRANSACTION_FAILED, 'ERR_TRANSACTION_FAILED');
    return manager.delete(AccountToken, {session});
  }

  @transaction(Com.businessDB)
  static async deleteAccountSessionByAccountId(accountId: AccountId, manager?: EntityManager) {
    if (!manager)
      throw new AppError(AppErrorCode.ERR_TRANSACTION_FAILED, 'ERR_TRANSACTION_FAILED');
    return manager.delete(AccountToken, {accountId});
  }

  @transaction(Com.businessDB)
  static async deleteAccountSessionByAccountIdExcept(accountId: AccountId, token: string, manager?: EntityManager) {
    if (!manager)
      throw new AppError(AppErrorCode.ERR_TRANSACTION_FAILED, 'ERR_TRANSACTION_FAILED');
    return manager.delete(AccountToken, {
      accountId,
      session: Not(token),
    });
  }

  @transaction(Com.businessDB)
  static async deleteExpiredAccountSession(manager?: EntityManager) {
    if (!manager)
      throw new AppError(AppErrorCode.ERR_TRANSACTION_FAILED, 'ERR_TRANSACTION_FAILED');
    return manager.delete(AccountToken, {
      expireAt: LessThan(UnixTime.now()),
    });
  }

  @transaction(Com.businessDB)
  static async deleteAccountSessionByGid(gid: AuthGroupId, manager?: EntityManager) {
    if (!manager)
      throw new AppError(AppErrorCode.ERR_TRANSACTION_FAILED, 'ERR_TRANSACTION_FAILED');
    return manager.delete(AccountToken, {gid});
  }

  @transaction(Com.businessDB)
  static async updateAccountGroupList(accountId: AccountId, groupIdList: AuthGroupId[], manager?: EntityManager) {
    if (!manager)
      throw new AppError(AppErrorCode.ERR_TRANSACTION_FAILED, 'ERR_TRANSACTION_FAILED');

    await manager.delete(AccountAuthGroup, {
      accountId,
    });

    const authGroupList: AccountAuthGroup[] =[];
    for (const group of groupIdList) {
      const accountAuthGroup = new AccountAuthGroup({
        accountId,
        groupId: group,
      });
      authGroupList.push(accountAuthGroup);
    }
    await manager.save(authGroupList);
  }

  static async hasAuth(gid: AuthGroupId, name: string) {
    if (gid === RootGroupId)
      return true;

    const permission = await Com.businessDB.manager.find(AuthPermission, {
      where: {
        gid,
        name,
      },
    });

    if (!permission.length)
      return false;

    return permission.every((p) => { return p.permission === PermissionResult.ALLOW; });
  }

  @transaction(Com.businessDB)
  static async resetAccountPassword(account: Account, password: string, manager?: EntityManager) {
    if (!manager)
      throw new AppError(AppErrorCode.ERR_TRANSACTION_FAILED, 'ERR_TRANSACTION_FAILED');

    const salt = Random.randomString(20);
    const hashedPassword = Hash.md5(password + salt);
    await manager.update(AccountLogin, {id: account.id, type: In([AccountLoginType.Username, AccountLoginType.Email])}, {
      password: hashedPassword,
      salt,
    });
  }

  static async sendAccountResetPassEmail(login: AccountLogin, code: string) {
    const template = ForgetPasswordEmail(code);
    await Com.aliCloud.pop.sendSingleEmail({
      ToAddress: login.username,
      Subject: template.subject,
      HtmlBody: template.bodyHtml,
    });

    const id = Random.randomString(8);
    await Com.businessRedis.setJSON(RedisKey.resetPasswordCode(id), {accountId: login.id, code}, NodeTime.minute(10));
    return id;
  }

  static async getAccountResetPassCode(id: string) {
    return Com.businessRedis.getJSON<{accountId: AccountId; code: string}>(RedisKey.resetPasswordCode(id));
  }

  static async createAccount(account: Pick<Account, 'nickname' | 'avatar'>, loginList: Pick<AccountLogin, 'type' | 'username' | 'password'>[], groupIdList: AuthGroupId[]) {
    return AccountLock.registerLock(loginList, async () => {
      const loginExisted = await Com.businessDB.manager.count(AccountLogin, {
        where: loginList.map(login => {
          return {
            type: login.type,
            username: login.username,
          };
        }),
      });

      if (loginExisted)
        throw new UserError(UserErrorCode.ERR_DUPLICATE_REGISTER, 'ERR_DUPLICATE_REGISTER');

      const newAccount = new Account({
        nickname: account.nickname,
        disabled: false,
        createTime: UnixTime.now(),
        lastLoginTime: 0,
        avatar: account.avatar,
      });

      const accountErrors = await validate(newAccount);
      if (accountErrors.length) {
        throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${accountErrors.map(e => e.property).join(',')}]`);
      }

      const salt = Random.randomString(20);
      const createdAccount = await Com.businessDB.manager.transaction(async (manager) => {
        const savedAcc = await manager.save(newAccount);
        const accountLoginList: AccountLogin[] = [];
        for (const login of loginList) {
          const accountLogin = new AccountLogin({
            id: savedAcc.id,
            type: login.type,
            username: login.username,
            salt,
            password: Hash.md5(login.password + salt),
          });
          accountLoginList.push(accountLogin);
        }
        await manager.save(accountLoginList);

        const authGroupList: AccountAuthGroup[] =[];
        for (const group of groupIdList) {
          const accountAuthGroup = new AccountAuthGroup({
            accountId: savedAcc.id,
            groupId: group,
          });
          authGroupList.push(accountAuthGroup);
        }
        await manager.save(authGroupList);

        return savedAcc;
      });

      Application.appLog.info('account-world', {event: 'create-account', account: {id: createdAccount.id, account}});

      return createdAccount;
    });
  }

  static async fetchAccountLogin(type: AccountLoginType, accountId: AccountId) {
    const login = await Com.businessDB.manager.findOne(AccountLogin, {
      where: {
        id: accountId,
        type,
      },
    });

    if (!login)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    return login;
  }

  static async fetchAccountPermission(accountId: AccountId) {
    const groupIdList = await Com.businessDB.manager.find<AccountAuthGroup>(AccountAuthGroup, {
      where: {
        accountId,
      },
    });

    const permissionList = await Com.businessDB.manager.find<AuthPermission>(AuthPermission, {
      where: {
        gid: In(groupIdList.map(g => g.groupId)),
      },
    });

    return new AccountPermission(permissionList);
  }

  static async fetchAccountLoginInfo(id: AccountId, token: AccountToken) {
    const account = await Com.businessDB.manager.findOne(Account, {
      where: {
        id,
      },
    });

    if (!account)
      throw new AppError(AppErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    const permissions = await this.fetchAccountPermission(id);

    return {
      account: {
        id: account.id,
        nickname: account.nickname,
        disabled: account.disabled,
        avatar: account.avatar,
      },
      permissions: permissions.list,
      authorization: {
        token: token.session,
        expireAt: token.expireAt,
      },
    };
  }

  static async accountLogin(accountId: AccountId, ttl: number) {
    const account = await Com.businessDB.manager.findOne(Account, {
      where: {
        id: accountId,
      },
    });

    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    if (account.disabled)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_DISABLED, 'ERR_ACCOUNT_DISABLED');

    const token = uuid();
    const newToken = await AccountWorld.setAccountSession(token, account, ttl);

    const loginInfo = await this.fetchAccountLoginInfo(accountId, newToken);

    Application.appLog.info('gateway', {event: 'account-login', account: {id: account.id}});

    return loginInfo;
  }
}

export {AccountWorld};
