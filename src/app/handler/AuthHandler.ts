import {Route, UnixTime} from '@sora-soft/framework';
import {AssertType, ValidateClass} from '@sora-soft/type-guard';
import {Com} from '../../lib/Com.js';
import {AccountRoute} from '../../lib/route/AccountRoute.js';
import {AuthRoute} from '../../lib/route/AuthRoute.js';
import {Hash, Random, Util} from '../../lib/Utility.js';
import {AccountId, AccountLoginType, AuthGroupId, PermissionResult} from '../account/AccountType.js';
import {AccountWorld} from '../account/AccountWorld.js';
import {Application} from '../Application.js';
import {Account, AccountAuthGroup, AccountLogin, AccountToken} from '../database/Account.js';
import {AuthGroup, AuthPermission} from '../database/Auth.js';
import {UserErrorCode} from '../ErrorCode.js';
import {RedisKey} from '../Keys.js';
import {UserError} from '../UserError.js';

export interface IReqUpdatePermission {
  gid: AuthGroupId;
  permissions: {
    name: string;
    permission: PermissionResult;
  }[];
}

export interface IReqUpdateAccount {
  accountId: AccountId;
  groupList?: AuthGroupId[];
  nickname?: string;
}

export interface IReqDisableAccount {
  accountId: AccountId;
  disabled: boolean;
}

export interface IReqDeleteAuthGroup {
  gid: AuthGroupId;
}

export interface IReqCreateAccount {
  username: string;
  nickname: string;
  email: string;
  groupList: AuthGroupId[];
  password: string;
}

export interface IReqResetPassword {
  id: AccountId;
  password: string;
}

export interface IReqRequestForgetPassword {
  email: string;
}

export interface IReqForgetPassword {
  id: string;
  code: string;
  password: string;
}

export interface IReqRegister {
  username: string;
  password: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
}

export interface IReqLogin {
  username: string;
  password: string;
  type: AccountLoginType;
  remember: boolean;
}

@ValidateClass()
class AuthHandler extends AuthRoute {
  @Route.method
  async login(@AssertType() body: IReqLogin) {
    const loginInfo = await Com.businessDB.manager.findOne(AccountLogin, {
      where: {
        type: body.type,
        username: body.username,
      },
    });
    if (!loginInfo)
      throw new UserError(UserErrorCode.ERR_USERNAME_NOT_FOUND, 'ERR_USERNAME_NOT_FOUND');

    const password = Hash.md5(body.password + loginInfo.salt);

    if (loginInfo.password !== password)
      throw new UserError(UserErrorCode.ERR_WRONG_PASSWORD, 'ERR_WRONG_PASSWORD');

    return AccountWorld.accountLogin(loginInfo.id, body.remember ? UnixTime.day(30) : UnixTime.hour(8));
  }

  @Route.method
  @AccountRoute.account()
  @AccountRoute.token()
  async info(body: void, account: Account, token: AccountToken) {
    account.lastLoginTime = UnixTime.now();
    await Com.businessDB.manager.save(account);

    return AccountWorld.fetchAccountLoginInfo(account.id, token);
  }

  @Route.method
  @AccountRoute.token()
  async logout(body: void, token: AccountToken) {
    await AccountWorld.deleteAccountSession(token.session);

    return {};
  }

  @Route.method
  @AuthRoute.auth()
  async updatePermission(@AssertType() body: IReqUpdatePermission) {
    const list: AuthPermission[] = [];

    const group = await Com.businessDB.manager.findOneBy(AuthGroup, {id: body.gid});

    if (!group)
      throw new UserError(UserErrorCode.ERR_AUTH_GROUP_NOT_FOUND, 'ERR_GROUP_NOT_FOUND');

    for (const p of body.permissions) {
      const authPermission = new AuthPermission();
      authPermission.gid = body.gid;
      authPermission.name = p.name;
      authPermission.permission = p.permission;
      list.push(authPermission);
    }
    await Com.businessDB.manager.transaction(async (manager) => {
      await manager.delete(AuthPermission, {gid: body.gid});
      await manager.save(list);
    });
    return {};
  }

  @Route.method
  @AuthRoute.auth()
  async updateAccount(@AssertType() body: IReqUpdateAccount) {
    await Com.businessDB.manager.transaction(async (manager) => {
      const account = await Com.businessDB.manager.findOne(Account, {
        where: {
          id: body.accountId,
        },
      });
      if (!account) {
        throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');
      }

      if (Util.isMeaningful(body.groupList)) {
        await AccountWorld.updateAccountGroupList(body.accountId, body.groupList, manager);
      }

      if (Util.isMeaningful(body.nickname)) {
        account.nickname = body.nickname;
      }

      await manager.save(account);
    });
    return {};
  }

  @Route.method
  @AuthRoute.auth()
  @AccountRoute.account()
  async disableAccount(@AssertType() body: IReqDisableAccount, account: Account) {
    if (account.id === body.accountId)
      throw new UserError(UserErrorCode.ERR_DISABLE_SELF, 'ERR_DISABLE_SELF');

    await Com.businessDB.manager.transaction(async (manager) => {
      const target = await Com.businessDB.manager.findOneBy(Account, {id: body.accountId});
      if (!target) {
        throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');
      }

      target.disabled = body.disabled;

      if (target.disabled) {
        await manager.delete(AccountToken, {accountId: target.id});
      }

      await manager.save(target);
    });

    return {};
  }

  @Route.method
  @AuthRoute.auth()
  async deleteAuthGroup(@AssertType() body: IReqDeleteAuthGroup) {
    const accounts = await Com.businessDB.manager.find(AccountAuthGroup, {
      where: {
        groupId: body.gid,
      },
    });

    if (accounts.length)
      throw new UserError(UserErrorCode.ERR_AUTH_GROUP_NOT_EMPTY, 'ERR_AUTH_GROUP_NOT_EMPTY');

    const group = await Com.businessDB.manager.findOne(AuthGroup, {
      where: {
        id: body.gid,
      },
    });

    if (!group)
      throw new UserError(UserErrorCode.ERR_AUTH_GROUP_NOT_FOUND, 'ERR_GROUP_NOT_FOUND');

    if (group.protected)
      throw new UserError(UserErrorCode.ERR_PROTECTED_GROUP, 'ERR_PROTECTED_GROUP');

    await Com.businessDB.manager.delete(AuthGroup, {
      id: body.gid,
    });

    return {};
  }

  @Route.method
  @AuthRoute.auth()
  async createAccount(@AssertType() body: IReqCreateAccount) {
    for (const gid of body.groupList) {
      const group = await Com.businessDB.manager.findOneBy(AuthGroup, {id: gid});

      if (!group)
        throw new UserError(UserErrorCode.ERR_AUTH_GROUP_NOT_FOUND, 'ERR_GROUP_NOT_FOUND');
    }

    const account = await AccountWorld.createAccount({
      nickname: body.nickname,
    }, [{
      type: AccountLoginType.Username,
      username: body.username,
      password: body.password,
    }, {
      type: AccountLoginType.Email,
      username: body.email,
      password: body.password,
    }], body.groupList);

    return {
      id: account.id,
    };
  }

  @Route.method
  @AuthRoute.auth()
  @AccountRoute.token()
  async resetPassword(@AssertType() body: IReqResetPassword, token: AccountToken) {
    const account = await Com.businessDB.manager.findOneBy(Account, {id: body.id});
    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    await Com.businessDB.manager.transaction(async (manager) => {
      await AccountWorld.resetAccountPassword(account, body.password, manager);
      if (body.id === token.accountId) {
        await AccountWorld.deleteAccountSessionByAccountIdExcept(account.id, token.session, manager);
      } else {
        await AccountWorld.deleteAccountSessionByAccountId(account.id, manager);
      }
    });
    Application.appLog.info('account-world', {event: 'reset-password', accountId: account.id, method: 'resetPassword'});

    return {};
  }

  @Route.method
  async requestForgetPassword(@AssertType() body: IReqRequestForgetPassword) {
    const account = await Com.businessDB.manager.findOneBy(AccountLogin, {
      type: AccountLoginType.Email,
      username: body.email,
    });

    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    const code = Random.randomString(4).toUpperCase();
    const id = await AccountWorld.sendAccountResetPassEmail(account, code);

    return {id};
  }

  @Route.method
  async forgetPassword(@AssertType() body: IReqForgetPassword) {
    const info = await AccountWorld.getAccountResetPassCode(body.id);
    if (!info || info.code !== body.code)
      throw new UserError(UserErrorCode.ERR_WRONG_EMAIL_CODE, 'ERR_WRONG_EMAIL_CODE');

    const account = await Com.businessDB.manager.findOneBy(Account, {id: info.accountId});
    if (!account)
      throw new UserError(UserErrorCode.ERR_WRONG_EMAIL_CODE, 'ERR_WRONG_EMAIL_CODE');

    await Com.businessDB.manager.transaction(async (manager) => {
      await AccountWorld.resetAccountPassword(account, body.password, manager);
      await AccountWorld.deleteAccountSessionByAccountId(account.id, manager);
    });

    Application.appLog.info('account-world', {event: 'reset-password', accountId: account.id, method: 'forgetPassword'});

    await Com.businessRedis.client.del(RedisKey.resetPasswordCode(body.id));

    return {};
  }
}

export {AuthHandler};
