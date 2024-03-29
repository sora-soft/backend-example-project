import {IDatabaseComponentOptions, DatabaseComponent} from '@sora-soft/database-component';
import {DataSource} from '@sora-soft/database-component/typeorm';
import {IWorkerOptions, Node, Runtime, Worker} from '@sora-soft/framework';
import {ComponentName} from '../../lib/Com.js';
import {Application} from '../Application.js';
import {WorkerName} from './common/WorkerName.js';
import camelcase from 'camelcase';
import fs = require('fs/promises');
import path = require('path');
import {fileURLToPath} from 'url';
import moment from 'moment';
import {mkdirp} from 'mkdirp';
import {UserError} from '../UserError.js';
import {AppErrorCode, UserErrorCode} from '../ErrorCode.js';
import {AppError} from '../AppError.js';
import {ISoraConfig} from '../Types.js';
import {TypeGuard} from '@sora-soft/type-guard';

const FileName = fileURLToPath(import.meta.url);
const Dirname = path.dirname(FileName);

const soraConfig = JSON.parse(
  await fs.readFile(path.resolve(Dirname, '../../../sora.json'), {encoding: 'utf-8'})
) as ISoraConfig;

export interface IDatabaseMigrateCommandWorkerOptions extends IWorkerOptions {
  components: ComponentName[];
}

class DatabaseMigrateCommandWorker extends Worker {
  static register() {
    Node.registerWorker(WorkerName.DatabaseMigrateCommand, (options: IDatabaseMigrateCommandWorkerOptions) => {
      return new DatabaseMigrateCommandWorker(WorkerName.DatabaseMigrateCommand, options);
    });
  }

  constructor(name: string, options: IDatabaseMigrateCommandWorkerOptions) {
    super(name, options);
    TypeGuard.assert<IDatabaseMigrateCommandWorkerOptions>(options);
    this.options_ = options;
  }

  protected async startup() {}

  protected async shutdown() {}

  async runCommand(commands: string[]) {
    const [action] = commands;

    switch (action) {
      case 'generate': {
        const projectPath = path.resolve(Dirname, '../../../');
        const migrationPath = soraConfig.migration;
        for (const name of this.options_.components) {
          const component: DatabaseComponent = Runtime.getComponent(name) ;
          if (!component)
            throw new AppError(AppErrorCode.ERR_COMPONENT_NOT_FOUND, `ERR_COMPONENT_NOT_FOUND, name=${name}`);

          const options = component.options as IDatabaseComponentOptions;

          Application.appLog.info('worker.generate-migrate', {component: name});

          const dataSource = new DataSource({
            ...options.database,
            entities: component.entities,
          });

          await dataSource.initialize();

          const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();
          const upSqls: string[] = [];
          const downSqls: string[] = [];

          sqlInMemory.upQueries.forEach(query => {
            upSqls.push('    await queryRunner.query(\'' + query.query.replace(new RegExp('\'', 'g'), '\\\'') + '\');');
          });
          sqlInMemory.downQueries.forEach(query => {
            downSqls.push('    await queryRunner.query(\'' + query.query.replace(new RegExp('\'', 'g'), '\\\'') + '\');');
          });

          if (upSqls.length || downSqls.length) {
            const className = `${camelcase(name, {pascalCase: true})}${Date.now()}`;
            const file =
`import {MigrationInterface, QueryRunner} from '@sora-soft/database-component/typeorm';

export class ${className} implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
${upSqls.join('\n')}
  }

  async down(queryRunner: QueryRunner): Promise<void> {
${downSqls.reverse().join('\n')}
  }
}
`;
            await mkdirp(path.resolve(projectPath, soraConfig.root, migrationPath, name));
            await fs.writeFile(path.resolve(projectPath, soraConfig.root, migrationPath, name, moment().format('YYYYMMDD') + className + '.ts'), file);
          }

          await dataSource.destroy();
        }

        break;
      }
      case 'sync': {
        for (const name of this.options_.components) {
          const component: DatabaseComponent = Runtime.getComponent(name) ;
          const options = component.options as IDatabaseComponentOptions;

          Application.appLog.info('worker.database-migrate', {event: 'sync-database', component: name});
          const dataSource = new DataSource({
            ...options.database,
            entities: component.entities,
            synchronize: true,
          });

          await dataSource.initialize();

          await dataSource.destroy();
        }
        break;
      }
      case 'migrate': {
        const [_, componentName] = commands;
        if (!componentName) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, 'ERR_PARAMETERS_INVALID'), 'Component name needed');
          return false;
        }

        const component: DatabaseComponent = Runtime.getComponent(componentName) ;
        if (!component) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, 'ERR_PARAMETERS_INVALID'), 'Component not found');
          return false;
        }

        const options = component.options as IDatabaseComponentOptions;
        const projectPath = path.resolve(Dirname, '../../../');
        const migrationPath = path.resolve(projectPath, soraConfig.dist, soraConfig.migration);

        const files = await fs.readdir(path.join(migrationPath, componentName));
        const migrationList = files.map((file) => path.join(migrationPath, componentName, file)).filter((file) => path.extname(file) === '.js');
        const dataSource = new DataSource({
          ...options.database,
          entities: component.entities,
          migrationsRun: false,
          migrations: migrationList,
        });

        await dataSource.initialize();

        await dataSource.runMigrations({
          transaction: 'all',
        });

        await dataSource.destroy();
        break;
      }

      case 'revert': {
        const [_, componentName] = commands;
        if (!componentName) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, 'ERR_PARAMETERS_INVALID'), 'Component name needed');
          return false;
        }

        const component: DatabaseComponent = Runtime.getComponent(componentName) ;
        if (!component) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, 'ERR_PARAMETERS_INVALID'), 'Component not found');
          return false;
        }

        const options = component.options as IDatabaseComponentOptions;

        const projectPath = path.resolve(Dirname, '../../../');
        const migrationPath = path.resolve(projectPath, soraConfig.dist, soraConfig.migration, componentName);

        const dataSource = new DataSource({
          ...options.database,
          entities: component.entities,
          migrationsRun: false,
          migrations: [path.join(migrationPath, '*.js')],
        });

        await dataSource.initialize();

        await dataSource.undoLastMigration({
          transaction: 'all',
        });

        await dataSource.destroy();
        break;
      }

      case 'drop': {
        const [_, componentName] = commands;
        if (!componentName) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, 'ERR_PARAMETERS_INVALID'), 'Component name needed');
          return false;
        }

        const component: DatabaseComponent = Runtime.getComponent(componentName);
        if (!component) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, 'ERR_PARAMETERS_INVALID'), 'Component not found');
          return false;
        }

        const options = component.options as IDatabaseComponentOptions;

        const dataSource = new DataSource({
          ...options.database,
          entities: component.entities,
        });

        await dataSource.initialize();
        await dataSource.dropDatabase();
        await dataSource.destroy();
        break;
      }
      default:
        break;
    }
    return true;
  }

  private options_: IDatabaseMigrateCommandWorkerOptions;
}

export {DatabaseMigrateCommandWorker};
