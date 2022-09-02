import { Auth, authenticate } from './authenticate';
import { wakeUpAll } from './controllers/heartbeat-controller';
import { IntegrationController } from './controllers/integration-controller';
import { RoleController } from './controllers/role-controller';
import { UserRoleMappingController } from './controllers/user-role-mapping-controller';
import 'reflect-metadata';
import { container } from 'tsyringe';
import deleteIntegrationSubmitted from '@lambda-shared/templates/delete-integration-submitted';

const responseHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
};

const BASE_PATH = '/api/v1';

const handleError = (res, err) => {
  console.error(err);
  res.status(422).json({ success: false, message: err.message || err });
};

const integrationController = container.resolve(IntegrationController);
const roleController = container.resolve(RoleController);
const userRoleMappingController = container.resolve(UserRoleMappingController);

export const setRoutes = (app: any) => {
  app.use((req, res, next) => {
    res.set(responseHeaders);
    if (next) next();
  });

  app.options('(.*)', async (req, res) => {
    res.status(200).json(null);
  });

  app.get(`${BASE_PATH}/heartbeat`, async (req, res) => {
    //#swagger.ignore = true
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
    //#swagger.ignore = true
    try {
      res.status(200).json({ teamId: req.teamId });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Intergrations']
      #swagger.path = '/integrations'
      #swagger.method = 'get'
      #swagger.description = 'Get all gold integrations created by your team'
      #swagger.summary = 'Get integrations'
      #swagger.responses[200] = {
        description: 'OK',
        schema: { success: true, data: [{ $ref: '#/components/schemas/integration' }] }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const result = await integrationController.listByTeam(req.teamId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Intergrations']
      #swagger.path = '/integrations/{integrationId}'
      #swagger.method = 'get'
      #swagger.description = 'Get gold integration created by your team'
      #swagger.summary = 'Get integration by id'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { success: true, data: { $ref: '#/components/schemas/integration' } }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const { integrationId } = req.params;
      const result = await integrationController.getIntegration(integrationId, req.teamId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles'
      #swagger.method = 'get'
      #swagger.description = 'Get roles created for your integration'
      #swagger.summary = 'Get roles'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { success: true, data: [{ $ref: '#/components/schemas/role' }] }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const { integrationId, environment } = req.params;
      const result = await roleController.list(req.teamId, integrationId, environment);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'get'
      #swagger.description = 'Get role by name'
      #swagger.summary = 'Get role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { success: true, data: [{ $ref: '#/components/schemas/role' }] }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const { integrationId, environment, roleName } = req.params;
      const result = await roleController.get(req.teamId, integrationId, environment, roleName);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/integrations/:integrationId/:environment/roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles'
      #swagger.method = 'put'
      #swagger.description = 'Create role for integration'
      #swagger.summary = 'Create role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true
      }
      #swagger.requestBody = {
        required: true,
        schema: { $ref: "#/components/schemas/role" }
      }
      #swagger.responses[201] = {
        description: 'Created',
        schema: { success: true, message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const { integrationId, environment } = req.params;
      await roleController.create(req.teamId, integrationId, req.body.roleName, environment);
      res.status(201).json({ success: true, message: 'created' });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'post'
      #swagger.description = 'Update role for integration'
      #swagger.summary = 'Update role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true
      }
      #swagger.requestBody = {
        required: true,
        schema: { $ref: "#/components/schemas/role" }
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { success: true, message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const { integrationId, environment, roleName } = req.params;
      const { newRoleName } = req.body;
      await roleController.update(req.teamId, integrationId, roleName, environment, newRoleName);
      res.status(200).json({ success: true, message: 'updated' });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'delete'
      #swagger.description = 'Delete role for integration'
      #swagger.summary = 'Delete role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { success: true, message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const { integrationId, environment, roleName } = req.params;
      await roleController.delete(req.teamId, integrationId, roleName, environment);
      res.status(200).json({ success: true, message: 'deleted' });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/user-role-mappings'
      #swagger.method = 'get'
      #swagger.description = 'Get user role mappings by role or user names for integration'
      #swagger.summary = 'Get user role mappings by role name or user name'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true
      }
      #swagger.parameters['roleName'] = {
        in: 'query',
        description: 'Role name',
      }
      #swagger.parameters['username'] = {
        in: 'query',
        description: 'Username',
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { success: true, data: { users: [{ $ref: '#/components/schemas/user' }], roles: [{ $ref: '#/components/schemas/role' }]} }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const { integrationId, environment } = req.params;
      const { roleName, username } = req.query;
      if (!roleName && !username) throw Error(`One of the query parameters (roleName, username) is a must`);
      const result = await userRoleMappingController.list(req.teamId, integrationId, environment, req.query);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/user-role-mappings'
      #swagger.method = 'post'
      #swagger.description = 'Create or delete user role mapping for integration'
      #swagger.summary = 'Manage user role mappings'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true
      }
      #swagger.requestBody = {
        required: true,
        schema: { $ref: '#/components/schemas/userRoleMappingRequest' }
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { success: true, message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {success: false, message: 'string'}
      }
    */
    try {
      const { integrationId, environment } = req.params;
      const { username, roleName, operation } = req.body;
      await userRoleMappingController.manage(req.teamId, integrationId, environment, username, roleName, operation);
      res.status(200).json({ success: true, message: operation === 'add' ? 'created' : 'deleted' });
    } catch (err) {
      handleError(res, err);
    }
  });
};
