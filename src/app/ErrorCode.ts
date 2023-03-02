export enum AppErrorCode {
  ERR_UNKNOWN = 'ERR_UNKNOWN',
  ERR_LOAD_CONFIG = 'ERR_LOAD_CONFIG',
  ERR_DATABASE = 'ERR_DATABASE',
  ERR_CONFIG_NOT_FOUND = 'ERR_CONFIG_NOT_FOUND',
  ERR_COMMAND_NOT_FOUND = 'ERR_COMMAND_NOT_FOUND',
  ERR_SERVICE_NOT_CREATED = 'ERR_SERVICE_NOT_CREATED',
  ERR_WORKER_NOT_CREATED = 'ERR_WORKER_NOT_CREATED',
  ERR_COMPONENT_NOT_FOUND = 'ERR_COMPONENT_NOT_FOUND',
}

export enum UserErrorCode {
  ERR_DUPLICATE_USERNAME = 'ERR_DUPLICATE_USERNAME',
  ERR_DUPLICATE_EMAIL = 'ERR_DUPLICATE_EMAIL',
  ERR_USERNAME_NOT_FOUND = 'ERR_USERNAME_NOT_FOUND',
  ERR_WRONG_PASSWORD = 'ERR_WRONG_PASSWORD',
  ERR_PARAMETERS_INVALID = 'ERR_PARAMETERS_INVALID',
  ERR_NOT_LOGIN = 'ERR_NOT_LOGIN',
  ERR_PROTECTED_GROUP = 'ERR_PROTECTED_GROUP',
  ERR_CANT_CREATE_ROOT = 'ERR_CANT_CREATE_ROOT',
  ERR_DUPLICATE_NICKNAME = 'ERR_DUPLICATE_NICKNAME',
  ERR_ACCOUNT_NOT_FOUND = 'ERR_ACCOUNT_NOT_FOUND',
  ERR_WRONG_EMAIL_CODE = 'ERR_WRONG_EMAIL_CODE',
  ERR_ACCOUNT_DISABLED = 'ERR_ACCOUNT_DISABLED',
  ERR_DISABLE_SELF = 'ERR_DISABLE_SELF',

  ERR_AUTH_GROUP_NOT_FOUND = 'ERR_AUTH_GROUP_NOT_FOUND',
  ERR_AUTH_GROUP_NOT_EMPTY = 'ERR_AUTH_GROUP_NOT_EMPTY',

  ERR_AUTH_DENY = 'ERR_AUTH_DENY',

  ERR_DB_NOT_FOUND = 'ERR_DB_NOT_FOUND',

  ERR_SERVER_INTERNAL = 'ERR_SERVER_INTERNAL',
}
