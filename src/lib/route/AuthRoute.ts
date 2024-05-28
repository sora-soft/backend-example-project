import {MiddlewarePosition, Route, Service} from '@sora-soft/framework';
import {AccountId} from '../../app/account/AccountType.js';
import {AccountWorld} from '../../app/account/AccountWorld.js';
import {UserErrorCode} from '../../app/ErrorCode.js';
import {IRestfulReq} from '../../app/handler/RestfulHandler.js';
import {UserError} from '../../app/UserError.js';
import {AuthRPCHeader, ForwardRPCHeader} from '../Const.js';

class AuthRoute<T extends Service = Service> extends Route {
  static auth(authName?: string) {
    return (target: AuthRoute, method: string) => {
      Route.registerMiddleware<AuthRoute>(target, method, MiddlewarePosition.Before, async (route, body, request) => {
        const fromGateway = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_ID);
        if (!fromGateway)
          return true;

        const checkAuthName = [route.service.name, authName || method].join('/');
        const accountId = request.getHeader<AccountId>(AuthRPCHeader.RPC_ACCOUNT_ID);

        if (!accountId)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        const permission = await AccountWorld.fetchAccountPermission(accountId);
        const allowed = permission.isAllow(checkAuthName);
        if (!allowed) {
          throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${checkAuthName}`);
        }
        return true;
      });
    };
  }

  static logined(target: AuthRoute, method: string) {
    Route.registerMiddleware(target, method, MiddlewarePosition.Before, async (route, body, request) => {
      const fromGateway = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_ID);
      if (!fromGateway)
        return true;

      const accountId = request.getHeader<AccountId>(AuthRPCHeader.RPC_ACCOUNT_ID);

      if (!accountId)
        throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
      return true;
    });
  }

  static restful(authName?: string) {
    return (target: AuthRoute, method: string) => {
      Route.registerMiddleware<AuthRoute>(target, method, MiddlewarePosition.Before, async (route, body: IRestfulReq, request) => {
        const fromGateway = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_ID);
        if (!fromGateway)
          return true;

        const db = body.db;
        const checkAuthName = [route.service.name, authName || method, db].join('/');

        const accountId = request.getHeader<AccountId>(AuthRPCHeader.RPC_ACCOUNT_ID);

        if (!accountId)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        const permission = await AccountWorld.fetchAccountPermission(accountId);
        const allowed = permission.isAllow(checkAuthName);
        if (!allowed) {
          throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${checkAuthName}`);
        }
        return true;
      });
    };
  }

  constructor(service: T) {
    super();
    this.service_ = service;
  }

  get service() {
    return this.service_;
  }

  private service_: T;
}

export {AuthRoute};
