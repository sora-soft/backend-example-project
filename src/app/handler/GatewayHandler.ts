import {Request, Route, RPCHeader} from '@sora-soft/framework';
import {Com} from '../../lib/Com';
import {Account, AccountPassword} from '../database/Account';
import {UserErrorCode} from '../ErrorCode';
import {ValidateClass, AssertType} from 'typescript-is';
import {UserError} from '../UserError';
import {AccountWorld} from '../account/AccountWorld';
import {ForwardRoute} from '../../lib/route/ForwardRoute';
import {UserGroupId} from '../account/AccountType';
import {Application} from '../Application';
import {Hash, NodeTime, Random} from '../../lib/Utility';
import {AuthPermission} from '../database/Auth';

export interface IRegisterReq {
  username: string;
  password: string;
  nickname: string;
  email: string;
}

export interface ILoginReq {
  username: string;
  password: string;
  remember: boolean;
}

export interface IAKLoginReq {
  accessKey: string;
  secretKey: string;
}

@ValidateClass()
class GatewayHandler extends ForwardRoute {
  @Route.method
  async register(@AssertType() body: IRegisterReq) {
    const account = await AccountWorld.createAccount({
      email: body.email,
      nickname: body.nickname,
      gid: UserGroupId,
    }, {
      username: body.username,
      password: body.password,
    });

    return {
      id: account.id,
    };
  }

  @Route.method
  async login(@AssertType() body: ILoginReq, request: Request<ILoginReq>) {
    const userPass = await Com.businessDB.manager.findOne(AccountPassword, {
      where: {
        username: body.username,
      },
    });
    if (!userPass)
      throw new UserError(UserErrorCode.ERR_USERNAME_NOT_FOUND, `ERR_USERNAME_NOT_FOUND`);

    const password = Hash.md5(body.password + userPass.salt);

    if (userPass.password !== password)
      throw new UserError(UserErrorCode.ERR_WRONG_PASSWORD, `ERR_WRONG_PASSWORD`);

    const session = request.getHeader(RPCHeader.RPC_SESSION_HEADER);

    const account = await Com.businessDB.manager.findOneBy(Account, {id: userPass.id});

    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, `ERR_ACCOUNT_NOT_FOUND`);

    await AccountWorld.setAccountSession(session, {
      accountId: userPass.id,
      gid: account.gid,
    }, body.remember ? NodeTime.day(5) : NodeTime.hour(8));

    const permissions = await Com.businessDB.manager.find(AuthPermission, {
      select: ['name', 'permission'],
      where: {
        gid: account.gid,
      }
    });

    Application.appLog.info('gateway', { event: 'account-login', account: { id: userPass.id, gid: account.gid, email: account.email, username: userPass.username } });

    return {
      account: {
        username: userPass.username,
        email: account.email,
        nickname: account.nickname,
      },
      permissions
    };
  }

  @Route.method
  async info(body: void, request: Request<void>) {
    const session = request.getHeader(RPCHeader.RPC_SESSION_HEADER);

    const cache = await AccountWorld.getAccountSession(session);
    if (!cache)
      throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

    const account = await Com.businessDB.manager.findOne(Account, {
      where: {
        id: cache.accountId
      },
      relations: {
        userPass: true
      }
    });

    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, `ERR_ACCOUNT_NOT_FOUND`);

    const permissions = await Com.businessDB.manager.find(AuthPermission, {
      select: ['name', 'permission'],
      where: {
        gid: cache.gid,
      },
    });

    return {
      account: {
        id: account.id,
        username: account.userPass.username,
        email: account.email,
        nickname: account.nickname,
      },
      permissions
    };
  }

  @Route.method
  async logout(body: void, request: Request<void>) {
    const session = request.getHeader(RPCHeader.RPC_SESSION_HEADER);

    await AccountWorld.deleteAccountSession(session);

    return {};
  }
}

export {GatewayHandler};
