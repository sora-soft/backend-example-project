import 'source-map-support/register.js';
import {Application, IApplicationOptions} from './app/Application.js';
import {ConfigLoader} from './lib/ConfigLoader.js';
import 'reflect-metadata';
import {Context, ExError, Logger, Runtime} from '@sora-soft/framework';
import {AppError} from './app/AppError.js';
import {AppErrorCode} from './app/ErrorCode.js';

export interface IStartupOptions {
  readonly config: string;
  readonly name?: string;
  readonly arguments?: string[];
}

export const container = async (options: IStartupOptions) => {
  const context = new Context();
  const config = await loadConfig(options);
  if (!config)
    throw new AppError(AppErrorCode.ERR_LOAD_CONFIG, 'ERR_LOAD_CONFIG');
  await Application.startLog(config.debug, config.logger).catch((err: ExError) => {
    // eslint-disable-next-line no-console
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });
  await Application.startContainer(config, context).catch(async (err: ExError) => {
    Application.appLog.fatal('start', err, {error: Logger.errorMessage(err)});
    context.abort();
    await Runtime.shutdown();
    process.exit(1);
  });
  context.complete();
};

export const server = async (options: IStartupOptions) => {
  const context = new Context();
  const config = await loadConfig(options);
  if (!config)
    throw new AppError(AppErrorCode.ERR_LOAD_CONFIG, 'ERR_LOAD_CONFIG');
  await Application.startLog(config.debug, config.logger).catch((err: ExError) => {
    // eslint-disable-next-line no-console
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });
  await Application.startServer(config, context).catch(async (err: ExError) => {
    Application.appLog.fatal('start', err, {error: Logger.errorMessage(err)});
    context.abort();
    await Runtime.shutdown();
    process.exit(1);
  });
  context.complete();
};

export const command = async (options: IStartupOptions) => {
  const context = new Context();
  const config = await loadConfig(options);
  if (!config)
    throw new AppError(AppErrorCode.ERR_LOAD_CONFIG, 'ERR_LOAD_CONFIG');
  await Application.startOnlyAppLog(config.debug, config.logger).catch((err: ExError) => {
    // eslint-disable-next-line no-console
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });

  if (!options.name)
    throw new AppError(AppErrorCode.ERR_COMMAND_NOT_FOUND, 'ERR_COMMAND_NOT_FOUND');

  if (!options.arguments)
    throw new AppError(AppErrorCode.ERR_COMMAND_NOT_FOUND, 'ERR_COMMAND_NOT_FOUND');

  await Application.startCommand(config, options.name, options.arguments, context).catch(async (err: ExError) => {
    Application.appLog.fatal('run-command', err, {error: Logger.errorMessage(err)});
    await Runtime.shutdown();
    process.exit(1);
  });
  context.complete();
  process.exit(0);
};

const loadConfig = async (options: IStartupOptions) => {
  const configLoader = new ConfigLoader<IApplicationOptions>();
  await configLoader.load(options.config);
  return configLoader.getConfig();
};
