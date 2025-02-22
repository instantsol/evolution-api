import { RequestHandler, Router } from 'express';

import { Auth, ConfigService, Database } from '../../config/env.config';
import { Logger } from '../../config/logger.config';
import { dbserver } from '../../libs/db.connect';
import { instanceNameSchema, oldTokenSchema, presenceOnlySchema } from '../../validate/validate.schema';
import { RouterBroker } from '../abstract/abstract.router';
import { InstanceDto, SetPresenceDto } from '../dto/instance.dto';
import { instanceController, kwikController } from '../server.module';
import { OldToken } from '../services/auth.service';
import { HttpStatus } from './index.router';

const logger = new Logger('InstanceRouter');

export class InstanceRouter extends RouterBroker {
  constructor(readonly configService: ConfigService, ...guards: RequestHandler[]) {
    super();
    const auth = configService.get<Auth>('AUTHENTICATION');
    this.router
      .post('/create', ...guards, async (req, res) => {
        logger.verbose('request received in createInstance');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);

        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceNameSchema,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.createInstance(instance),
        });

        return res.status(HttpStatus.CREATED).json(response);
      })
      .put(this.routerPath('restart'), ...guards, async (req, res) => {
        logger.verbose('request received in restartInstance');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceNameSchema,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.restartInstance(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('registerMobileCode'), ...guards, async (req, res) => {
        logger.verbose('request received in registerMobileCode');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<null>({
          request: req,
          schema: instanceNameSchema,
          ClassRef: SetPresenceDto,
          execute: (instance, data) => instanceController.registerMobileCode(instance, data),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('connect'), ...guards, async (req, res) => {
        logger.verbose('request received in connectInstance');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceNameSchema,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.connectToWhatsapp(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('connectionState'), ...guards, async (req, res) => {
        logger.verbose('request received in connectionState');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceNameSchema,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.connectionState(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('fetchInstances', false), ...guards, async (req, res) => {
        logger.verbose('request received in fetchInstances');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        const key = req.get('apikey');
        const fullFetch = req.query.fullFetch ? Number(req.query.fullFetch) : 0;
        const messageTimestamp = req.query.messageTimestamp ? req.query.messageTimestamp : -1;

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.fetchInstances(instance, key),
        });

        if (fullFetch > 0) {
          const usageData = await this.dataValidate<InstanceDto>({
            request: req,
            schema: null,
            ClassRef: InstanceDto,
            execute: (instance) => kwikController.instanceInfo(instance, Number(messageTimestamp), fullFetch),
          });
          response.usageData = usageData;
        }

        return res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('setPresence'), ...guards, async (req, res) => {
        logger.verbose('request received in setPresence');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<null>({
          request: req,
          schema: presenceOnlySchema,
          ClassRef: SetPresenceDto,
          execute: (instance, data) => instanceController.setPresence(instance, data),
        });

        return res.status(HttpStatus.CREATED).json(response);
      })
      .delete(this.routerPath('logout'), ...guards, async (req, res) => {
        logger.verbose('request received in logoutInstances');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceNameSchema,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.logout(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .delete(this.routerPath('delete'), ...guards, async (req, res) => {
        logger.verbose('request received in deleteInstances');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceNameSchema,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.deleteInstance(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      });

    if (auth.TYPE === 'jwt') {
      this.router.put('/refreshToken', async (req, res) => {
        logger.verbose('request received in refreshToken');
        logger.verbose('request body: ');
        logger.verbose(req.body);

        logger.verbose('request query: ');
        logger.verbose(req.query);
        const response = await this.dataValidate<OldToken>({
          request: req,
          schema: oldTokenSchema,
          ClassRef: OldToken,
          execute: (_, data) => instanceController.refreshToken(_, data),
        });

        return res.status(HttpStatus.CREATED).json(response);
      });
    }

    this.router.delete('/deleteDatabase', async (req, res) => {
      logger.verbose('request received in deleteDatabase');
      logger.verbose('request body: ');
      logger.verbose(req.body);

      logger.verbose('request query: ');
      logger.verbose(req.query);
      const db = this.configService.get<Database>('DATABASE');
      if (db.ENABLED) {
        try {
          await dbserver.dropDatabase();
          return res
            .status(HttpStatus.CREATED)
            .json({ status: 'SUCCESS', error: false, response: { message: 'database deleted' } });
        } catch (error) {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: true, message: error.message });
        }
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: true, message: 'Database is not enabled' });
    });
  }

  public readonly router = Router();
}
