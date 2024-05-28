import {ExError} from '@sora-soft/framework';
import {AppErrorCode} from './ErrorCode.js';

class AppError extends ExError {
  constructor(code: AppErrorCode, message: string, ...args: unknown[]) {
    super(code, 'AppError', message, undefined, undefined, ...args);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export {AppError};
