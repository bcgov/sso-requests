// Extend the Request interface with the resolved API account authorization context.
declare global {
  namespace Express {
    interface Request {
      teamId?: number;
      apiClientId?: string;
      authz?: AuthContext;
    }
  }
}

import { NextFunction, Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import { KeycloakService, KeycloakServiceFactory } from './services/keycloak-service';
import { IntegrationController } from './controllers/integration-controller';
import { RoleController } from './controllers/role-controller';
import { TokenController } from './controllers/token-controller';
import { LogsController } from './controllers/logs-controller';
import { UserController } from './controllers/user-controller';
import { UserRoleMappingController } from './controllers/user-role-mapping-controller';
import { IntegrationService } from './services/integration-service';
import { RoleService } from './services/role-service';
import { UserRoleMappingService } from './services/user-role-mapping-service';
import { UserService } from './services/user-service';
import { BceidWebserviceService } from './services/bceid-webservice';
import { MsGraphService } from './services/ms-graph-idir';
import { handleError } from './utils';
import { Auth, authenticate } from './modules/authenticate';
import createHttpError from 'http-errors';
import { isEmpty } from 'lodash';
import { wakeUpAll } from './controllers/heartbeat-controller';
import { logsRateLimiter } from './modules/redis';
import { AuthContext, assertValidEnvironment, getAuthContext } from './modules/authorization';
import { ACTIONS, RESOURCES } from './constants';
import { ListBceidUsersFilterQuery, ListUserRoleMappingQuery } from './types';
import { collectApiUsageMetrics } from './middleware/api-usage';

const router = Router();

container.registerSingleton('KeycloakServiceFactory', KeycloakServiceFactory);
container.registerSingleton('DevKeycloakService', KeycloakService);
container.registerSingleton('TestKeycloakService', KeycloakService);
container.registerSingleton('ProdKeycloakService', KeycloakService);
container.registerSingleton('RoleService', RoleService);
container.registerSingleton('IntegrationService', IntegrationService);
container.registerSingleton('UserRoleMappingService', UserRoleMappingService);
container.registerSingleton('UserService', UserService);
container.registerSingleton('BceidWebserviceService', BceidWebserviceService);
container.registerSingleton('MsGraphService', MsGraphService);
const integrationController = container.resolve(IntegrationController);
const roleController = container.resolve(RoleController);
const userRoleMappingController = container.resolve(UserRoleMappingController);
const tokenController = container.resolve(TokenController);
const logsController = container.resolve(LogsController);
const userController = container.resolve(UserController);
const integrationService = container.resolve(IntegrationService);

router.use(collectApiUsageMetrics);

router.get(`/heartbeat`, async (req: Request, res: Response) => {
  try {
    const result = await wakeUpAll();
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

//overide everything if maintenance mode enabled
router.use(async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.MAINTENANCE_MODE_ACTIVE === 'true') {
    res.status(503).send('API not available. The Keycloak application is in a Disaster Recovery state.');
  } else {
    next();
  }
});

router.post(`/token`, async (req: Request, res: Response) => {
  try {
    const result = await tokenController.getToken(req.headers, req.body);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.use(async (req: Request, res: Response, next: NextFunction) => {
  const auth: Auth = await authenticate(req.headers);
  if (!auth.success) {
    res.status(401).json(auth);
    return;
  }
  req.teamId = auth?.data?.teamId;
  req.apiClientId = auth?.data?.apiClientId;

  const authz = await getAuthContext(req.apiClientId);
  if (!authz) {
    res.status(401).json({ success: false, data: null, err: 'not authorized' });
    return;
  }
  req.authz = authz;
  next();
});

// Environment is a grant dimension, so an unrecognised value must be rejected
// before any authorization decision is made rather than failing downstream.
router.use((req: Request, res: Response, next: NextFunction) => {
  const { environment } = req.params as Record<string, string>;
  try {
    if (environment !== undefined) assertValidEnvironment(environment);
    next();
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/verify-token`, async (req: Request, res: Response) => {
  try {
    res.status(200).json({ teamId: req.teamId });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/integrations`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const result = await integrationController.list(req.authz);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/integrations/:integrationId`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId } = req.params as Record<string, string>;
    const result = await integrationController.getIntegration(Number(integrationId), req.authz);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/integrations/:integrationId/:environment/logs`, logsRateLimiter, async (req: Request, res: Response) => {
  try {
    const { integrationId, environment } = req.params as Record<string, string>;
    const { start, end } = req.query || {};
    assertValidEnvironment(environment);
    const int = await integrationService.getById(Number(integrationId), req.authz, {
      resource: RESOURCES.INTEGRATIONS,
      action: ACTIONS.READ,
      environment,
    });
    const { status, message, data } = await logsController.getLogs(
      environment,
      int.clientId,
      int.id.toString(),
      start,
      end,
    );
    if (status === 200) res.status(status).send({ data, message });
    else res.status(status).send({ message });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/integrations/:integrationId/:environment/roles`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId, environment } = req.params as Record<string, string>;
    const result = await roleController.list(req.authz, Number(integrationId), environment);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/integrations/:integrationId/:environment/roles/:roleName`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId, environment, roleName } = req.params as Record<string, string>;
    const decodedRoleName = decodeURIComponent(roleName);
    const result = await roleController.get(req.authz, Number(integrationId), environment, decodedRoleName);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post(`/integrations/:integrationId/:environment/roles`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId, environment } = req.params as Record<string, string>;
    const result = await roleController.create(req.authz, Number(integrationId), req.body, environment);
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.put(`/integrations/:integrationId/:environment/roles/:roleName`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId, environment, roleName } = req.params as Record<string, string>;
    const decodedRoleName = decodeURIComponent(roleName);
    const result = await roleController.update(
      req.authz,
      Number(integrationId),
      decodedRoleName,
      environment,
      req.body,
    );
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete(`/integrations/:integrationId/:environment/roles/:roleName`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId, environment, roleName } = req.params as Record<string, string>;
    const decodedRoleName = decodeURIComponent(roleName);
    await roleController.delete(req.authz, Number(integrationId), decodedRoleName, environment);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.get(
  `/integrations/:integrationId/:environment/roles/:roleName/composite-roles`,
  async (req: Request, res: Response) => {
    try {
      if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
      const { integrationId, environment, roleName } = req.params as Record<string, string>;
      const decodedRoleName = decodeURIComponent(roleName);
      const result = await roleController.getComposites(req.authz, Number(integrationId), decodedRoleName, environment);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  },
);

router.get(
  `/integrations/:integrationId/:environment/roles/:roleName/composite-roles/:compositeRoleName`,
  async (req: Request, res: Response) => {
    try {
      if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
      const { integrationId, environment, roleName, compositeRoleName } = req.params as Record<string, string>;
      const decodedRoleName = decodeURIComponent(roleName);
      const decodedCompositeRoleName = decodeURIComponent(compositeRoleName);
      const result = await roleController.getComposite(
        req.authz,
        Number(integrationId),
        decodedRoleName,
        environment,
        decodedCompositeRoleName,
      );
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

router.post(
  `/integrations/:integrationId/:environment/roles/:roleName/composite-roles`,
  async (req: Request, res: Response) => {
    try {
      if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
      const { integrationId, environment, roleName } = req.params as Record<string, string>;
      const decodedRoleName = decodeURIComponent(roleName);
      const result = await roleController.createComposite(
        req.authz,
        Number(integrationId),
        decodedRoleName,
        environment,
        req.body,
      );
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

router.delete(
  `/integrations/:integrationId/:environment/roles/:roleName/composite-roles/:compositeRoleName`,
  async (req: Request, res: Response) => {
    try {
      if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
      const { integrationId, environment, roleName, compositeRoleName } = req.params as Record<string, string>;
      const decodedRoleName = decodeURIComponent(roleName);
      const decodedCompositeRoleName = decodeURIComponent(compositeRoleName);
      await roleController.deleteComposite(
        req.authz,
        Number(integrationId),
        decodedRoleName,
        environment,
        decodedCompositeRoleName,
      );
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  },
);

router.get(`/integrations/:integrationId/:environment/user-role-mappings`, async (req: Request, res: Response) => {
  try {
    const { integrationId, environment } = req.params as Record<string, string>;
    const result = await userRoleMappingController.list(
      req.authz,
      Number(integrationId),
      environment,
      req?.query as ListUserRoleMappingQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post(`/integrations/:integrationId/:environment/user-role-mappings`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId, environment } = req.params as Record<string, string>;
    const result = await userRoleMappingController.manage(req.authz, Number(integrationId), environment, req.body);
    req.body.operation === 'add' ? res.status(201).json(result) : res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/:environment/idir/users`, async (req: Request, res: Response) => {
  try {
    const { environment } = req.params as Record<string, string>;
    const result = await userController.listUsers(environment, 'idir', req.query);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/:environment/azure-idir/users`, async (req: Request, res: Response) => {
  try {
    const { environment } = req.params as Record<string, string>;
    const result = await userController.listUsers(environment, 'azureidir', req.query);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/:environment/github-bcgov/users`, async (req: Request, res: Response) => {
  try {
    const { environment } = req.params as Record<string, string>;
    const result = await userController.listUsers(environment, 'githubbcgov', req.query);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/:environment/github-public/users`, async (req: Request, res: Response) => {
  try {
    const { environment } = req.params as Record<string, string>;
    const result = await userController.listUsers(environment, 'githubpublic', req.query);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/:environment/basic-bceid/users`, async (req: Request, res: Response) => {
  try {
    const { environment } = req.params as Record<string, string>;
    const result = await userController.listUsers(environment, 'bceidbasic', req.query);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/:environment/business-bceid/users`, async (req: Request, res: Response) => {
  try {
    const { environment } = req.params as Record<string, string>;
    const result = await userController.listUsers(environment, 'bceidbusiness', req.query);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/:environment/basic-business-bceid/users`, async (req: Request, res: Response) => {
  try {
    const { environment } = req.params as Record<string, string>;
    const result = await userController.listUsers(environment, 'bceidboth', req.query);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/integrations/:integrationId/:environment/bceid/users`, async (req: Request, res: Response) => {
  try {
    const { integrationId, environment } = req.params as Record<string, string>;
    const result = await userController.listBceidUsers(
      req.authz,
      Number(integrationId),
      environment,
      req.query as ListBceidUsersFilterQuery,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/integrations/:integrationId/:environment/users/:username/roles`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId, environment, username } = req.params as Record<string, string>;
    const result = await userRoleMappingController.listRolesByUsername(
      req.authz,
      Number(integrationId),
      environment,
      username,
    );
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get(`/integrations/:integrationId/:environment/roles/:roleName/users`, async (req: Request, res: Response) => {
  try {
    const { integrationId, environment, roleName } = req.params as Record<string, string>;
    const decodedRoleName = decodeURIComponent(roleName);
    const result = await userRoleMappingController.listUsersByRolename(
      req.authz,
      Number(integrationId),
      environment,
      decodedRoleName,
      req.query,
    );
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post(`/integrations/:integrationId/:environment/users/:username/roles`, async (req: Request, res: Response) => {
  try {
    if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
    const { integrationId, environment, username } = req.params as Record<string, string>;
    const result = await userRoleMappingController.addRoleToUser(
      req.authz,
      Number(integrationId),
      environment,
      username,
      req.body,
    );
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post(
  `/integrations/:integrationId/:environment/users/:username/roles-new`,
  async (req: Request, res: Response) => {
    try {
      if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
      const { integrationId, environment, username } = req.params as Record<string, string>;
      const result = await userRoleMappingController.addRoleToUserWithProvisioning(
        req.authz,
        Number(integrationId),
        environment,
        username,
        req.body,
      );
      res.status(201).json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

router.delete(
  `/integrations/:integrationId/:environment/users/:username/roles/:roleName`,
  async (req: Request, res: Response) => {
    try {
      if (!isEmpty(req.query)) throw new createHttpError.BadRequest('invalid request');
      const { integrationId, environment, username, roleName } = req.params as Record<string, string>;
      const decodedRoleName = decodeURIComponent(roleName);
      const result = await userRoleMappingController.deleteRoleFromUser(
        req.authz,
        Number(integrationId),
        environment,
        username,
        decodedRoleName,
      );
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  },
);

export default router;
