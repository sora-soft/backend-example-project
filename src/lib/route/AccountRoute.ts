import {MiddlewarePosition, Route} from '@sora-soft/framework';
import {FindOptionsRelations} from '@sora-soft/database-component/typeorm';
import {Account, AccountToken} from '../../app/database/Account.js';
import {UserErrorCode} from '../../app/ErrorCode.js';
import {UserError} from '../../app/UserError.js';
import {Com} from '../Com.js';
import {AuthRPCHeader} from '../Const.js';
import {AccountPermission} from '../../app/account/AccountPermission.js';
import {AccountWorld} from '../../app/account/AccountWorld.js';
import {Application} from '../../app/Application.js';

interface IAccountOptions {
  relations?: FindOptionsRelations<Pick<Account, 'groupList'>>;
}

class AccountRoute extends Route {
  static log() {
    return (target: AccountRoute, method: string) => {
      Route.registerMiddleware(target, method, MiddlewarePosition.After, async (route, body, request, response) => {
        const accountId = request.getHeader<number>(AuthRPCHeader.RPC_ACCOUNT_ID);
        if (!accountId)
          return true;

        if (!response || response.payload.error)
          return true;

        Application.appLog.info('account', {event: 'account-operation', accountId, operation: method, body});
        return true;
      });
    };
  }

  static account(options?: IAccountOptions) {
    return (target: AccountRoute, method: string) => {
      Route.registerProvider(target, method, Account, async (route, body, request) => {
        const accountId = request.getHeader<number>(AuthRPCHeader.RPC_ACCOUNT_ID);
        if (!accountId)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        const relations = options?.relations || {};

        const account = await Com.businessDB.manager.findOne<Account>(Account, {
          where: {
            id: accountId,
          },
          relations,
        });
        if (!account)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        return account;
      });
    };
  }

  static token() {
    return (target: AccountRoute, method: string) => {
      Route.registerProvider(target, method, AccountToken, async (route, body, request) => {
        const session = request.getHeader<string>(AuthRPCHeader.RPC_AUTHORIZATION);
        if (!session)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        const token = await Com.businessDB.manager.findOne(AccountToken, {
          where: {
            session,
          },
        });
        if (!token)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        return token;
      });
    };
  }

  static permission() {
    return (target: AccountRoute, method: string) => {
      Route.registerProvider(target, method, AccountPermission, async (route, body, request) => {
        const accountId = request.getHeader<number>(AuthRPCHeader.RPC_ACCOUNT_ID);
        if (!accountId)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        return AccountWorld.fetchAccountPermission(accountId);
      });
    };
  }
}

export {AccountRoute};
