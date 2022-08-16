import { Auth, authenticate } from './authenticate';
import { wakeUpAll } from './controllers/HeartbeatController';
import { IntegrationController } from './controllers/IntegrationController';
import { RoleController } from './controllers/RoleController';
import { UserRoleMappingController } from './controllers/UserRoleMappingController';

const responseHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
};

const BASE_PATH = '/api';

const handleError = (res, err) => {
  console.error(err);
  res.status(422).json({ success: false, message: err.message || err });
};

export const setRoutes = (app: any) => {
  app.use((req, res, next) => {
    res.set(responseHeaders);
    if (next) next();
  });

  app.options('(.*)', async (req, res) => {
    res.status(200).json(null);
  });

  app.get(`${BASE_PATH}/heartbeat`, async (req, res) => {
    try {
      const result = await wakeUpAll();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.use(async (req, res, next) => {
    const auth: Auth = await authenticate(req.headers);
    if (!auth.success) {
      res.status(401).json(auth);
      return false;
    } else {
      req.teamId = auth.data.teamId;
    }
    if (next) next();
  });

  app.get(`${BASE_PATH}/verify-token`, async (req, res) => {
    try {
      res.status(200).json({ teamId: req.teamId });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations`, async (req, res) => {
    try {
      const result = await new IntegrationController().listByTeam(1849);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId`, async (req, res) => {
    try {
      const result = await new IntegrationController().getIntegration(2, 1849);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/roles`, async (req, res) => {
    try {
      const { integrationId, environment } = req.params;
      const result = await new RoleController().list(req.teamId, integrationId, environment);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/integrations/:integrationId/:environment/roles`, async (req, res) => {
    try {
      const { integrationId, environment } = req.params;
      const result = await new RoleController().create(req.teamId, integrationId, req.body.roleName, environment);
      res.status(200).json({ message: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/integrations/:integrationId/:environment/roles`, async (req, res) => {
    try {
      const { integrationId, environment } = req.params;
      const { roleName } = req.query;
      const { newRoleName } = req.body;
      const result = await new RoleController().update(req.teamId, integrationId, roleName, environment, newRoleName);
      res.status(200).json({ message: 'updated' });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    try {
      const { integrationId, environment, roleName } = req.params;
      const result = await new RoleController().delete(req.teamId, integrationId, roleName, environment);
      res.status(204).json({ message: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    try {
      const { integrationId, environment } = req.params;
      const result = await new UserRoleMappingController().list(req.teamId, integrationId, environment);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    try {
      const { integrationId, environment } = req.params;
      const { roleName } = req.query;
      const result = await new UserRoleMappingController().get(req.teamId, integrationId, environment, roleName);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    try {
      const { integrationId, environment } = req.params;
      const { userName, roleName, operation } = req.body;
      const result = await new UserRoleMappingController().manage(
        req.teamId,
        integrationId,
        environment,
        userName,
        roleName,
        operation,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });
};
