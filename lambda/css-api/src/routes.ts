import { Auth, authenticate } from './authenticate';
import { wakeUpAll } from './controllers/heartbeat-controller';
import { IntegrationController } from './controllers/integration-controller';
import { RoleController } from './controllers/role-controller';
import { UserRoleMappingController } from './controllers/user-role-mapping-controller';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { TokenController } from './controllers/token-controller';
import { isEmpty } from 'lodash';
import createHttpError from 'http-errors';
import { UserController } from './controllers/user-controller';

const responseHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
};

const BASE_PATH = '/api/v1';

const handleError = (res, err) => {
  res.status(err.status || 422).json({ message: err.message || err });
};

const integrationController = container.resolve(IntegrationController);
const roleController = container.resolve(RoleController);
const userRoleMappingController = container.resolve(UserRoleMappingController);
const tokenController = container.resolve(TokenController);
const userController = container.resolve(UserController);

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

  app.post(`${BASE_PATH}/token`, async (req, res) => {
    //#swagger.ignore = true
    try {
      const result = await tokenController.getToken(req.headers, req.body);
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
      #swagger.tags = ['Integrations']
      #swagger.path = '/integrations'
      #swagger.method = 'get'
      #swagger.description = 'Get list of gold standard integrations created by your team'
      #swagger.summary = 'Get list of integrations'
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/integration' }] }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: { message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const result = await integrationController.listByTeam(req.teamId);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Integrations']
      #swagger.path = '/integrations/{integrationId}'
      #swagger.method = 'get'
      #swagger.description = 'Get gold integration by Id created by your team'
      #swagger.summary = 'Get gold integration'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { $ref: '#/components/schemas/integration' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: { message: 'string' }
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId } = req.params;
      const result = await integrationController.getIntegration(integrationId, req.teamId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles'
      #swagger.method = 'get'
      #swagger.description = 'Get list of roles created for your integration of target environment'
      #swagger.summary = 'Get list of roles'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/roleResponse' }] }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: { message: 'string' }
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment } = req.params;
      const result = await roleController.list(req.teamId, integrationId, environment);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'get'
      #swagger.description = 'Get role by role name created for your integration of target environment'
      #swagger.summary = 'Get role by role name'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true,
        example: 'client-role'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { $ref: '#/components/schemas/roleResponse' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment, roleName } = req.params;
      const result = await roleController.get(req.teamId, integrationId, environment, roleName);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/integrations/:integrationId/:environment/roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles'
      #swagger.method = 'post'
      #swagger.description = 'Create role for your integration of target environment'
      #swagger.summary = 'Create role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.requestBody = {
        required: true,
        schema: { $ref: "#/components/schemas/roleRequest" }
      }
      #swagger.responses[201] = {
        description: 'Created',
        schema: { $ref: '#/components/schemas/roleResponse' }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[409] = {
        description: 'Conflict',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment } = req.params;
      const result = await roleController.create(req.teamId, integrationId, req.body, environment);
      res.status(201).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'put'
      #swagger.description = 'Update role created for your integration of target environment'
      #swagger.summary = 'Update role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true,
        example: 'client-role'
      }
      #swagger.requestBody = {
        required: true,
        schema: { $ref: "#/components/schemas/roleRequest" }
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { $ref: '#/components/schemas/roleResponse' }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[409] = {
        description: 'Conflict',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment, roleName } = req.params;
      const result = await roleController.update(req.teamId, integrationId, roleName, environment, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'delete'
      #swagger.description = 'Delete role created for your integration of target environment'
      #swagger.summary = 'Delete role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true,
        example: 'client-role'
      }
      #swagger.responses[204] = {
        description: 'No Content'
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment, roleName } = req.params;
      await roleController.delete(req.teamId, integrationId, roleName, environment);
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName/composite-roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles'
      #swagger.method = 'get'
      #swagger.description = 'Get list of composites of a role created for your integration of target environment'
      #swagger.summary = 'Get list of composites of a role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true,
        example: 'client-role'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/roleResponse' }] }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[409] = {
        description: 'Conflict',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment, roleName } = req.params;
      const result = await roleController.getComposites(req.teamId, integrationId, roleName, environment);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(
    `${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName/composite-roles/:compositeRoleName`,
    async (req, res) => {
      /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles/{compositeRoleName}'
      #swagger.method = 'get'
      #swagger.description = 'Get composite of a role created for your integration of target environment'
      #swagger.summary = 'Get composite of a role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true,
        example: 'client-role'
      }
      #swagger.parameters['compositeRoleName'] = {
        in: 'path',
        description: 'Composite role name',
        required: true,
        example: 'composite-client-role'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { $ref: '#/components/schemas/roleResponse' }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[409] = {
        description: 'Conflict',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
      try {
        if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
        const { integrationId, environment, roleName, compositeRoleName } = req.params;
        const result = await roleController.getComposite(
          req.teamId,
          integrationId,
          roleName,
          environment,
          compositeRoleName,
        );
        res.status(200).json(result);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  app.post(
    `${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName/composite-roles`,
    async (req, res) => {
      /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles'
      #swagger.method = 'post'
      #swagger.description = 'Add composite to role for your integration of target environment'
      #swagger.summary = 'Add composite to role'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true,
        example: 'client-role'
      }
      #swagger.requestBody = {
        required: true,
        schema: { $ref: '#/components/schemas/compositeRoleRequest' }
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { $ref: '#/components/schemas/roleResponse' }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[409] = {
        description: 'Conflict',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
      try {
        if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
        const { integrationId, environment, roleName } = req.params;
        const result = await roleController.createComposite(req.teamId, integrationId, roleName, environment, req.body);
        res.status(200).json(result);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  app.delete(
    `${BASE_PATH}/integrations/:integrationId/:environment/roles/:roleName/composite-roles/:compositeRoleName`,
    async (req, res) => {
      /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles/{compositeRoleName}'
      #swagger.method = 'delete'
      #swagger.description = 'Delete composite from a role created for your integration of target environment'
      #swagger.summary = "Delete composite from a role"
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true,
        example: 'client-role'
      }
      #swagger.parameters['compositeRoleName'] = {
        in: 'path',
        description: 'Composite role name',
        required: true,
        example: 'composite-client-role'
      }
      #swagger.responses[204] = {
        description: 'No Content',
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[409] = {
        description: 'Conflict',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
      try {
        if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
        const { integrationId, environment, roleName, compositeRoleName } = req.params;
        await roleController.deleteComposite(req.teamId, integrationId, roleName, environment, compositeRoleName);
        res.status(204).send();
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  app.get(`${BASE_PATH}/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/user-role-mappings'
      #swagger.method = 'get'
      #swagger.description = 'Get user role mappings by role name or user name for your integration of target environment <br><br> <b>Note:</b> Either roleName or username is required'
      #swagger.summary = 'Get user role mappings by role name or user name'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['roleName'] = {
        in: 'query',
        description: 'Role name',
        example: 'client-role'
      }
      #swagger.parameters['username'] = {
        in: 'query',
        description: 'Username',
        example: '08fe81112408411081ea011cf0ec945d@idir'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { users: [{ $ref: '#/components/schemas/user' }], roles: [{ $ref: '#/components/schemas/roleResponse' }] }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      const { integrationId, environment } = req.params;
      const result = await userRoleMappingController.list(req.teamId, integrationId, environment, req.query);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/user-role-mappings'
      #swagger.method = 'post'
      #swagger.description = 'Create or delete user role mappings for your integration of target environment'
      #swagger.summary = 'Create or delete user role mappings'
      #swagger.parameters['integrationId'] = {
        in: 'path',
        description: 'Integration Id',
        required: true,
        type: 'number',
        example: 1234
      }
      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.requestBody = {
        required: true,
        schema: { $ref: '#/components/schemas/userRoleMappingRequest' }
      }
      #swagger.responses[201] = {
        description: 'Created',
        schema: { users: [{ $ref: '#/components/schemas/user' }], roles: [{ $ref: '#/components/schemas/roleResponse' }] }
      }
      #swagger.responses[204] = {
        description: 'No Content'
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[404] = {
        description: 'Not Found',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment } = req.params;
      const result = await userRoleMappingController.manage(req.teamId, integrationId, environment, req.body);
      req.body.operation === 'add' ? res.status(201).json(result) : res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/:environment/idir/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Users']
      #swagger.path = '/{environment}/idir/users'
      #swagger.method = 'get'
      #swagger.description = 'Get list of users for IDIR by query for target environment <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore firstName, lastName, and email query params'
      #swagger.summary = 'Get list of users for IDIR by query'

      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['firstName'] = {
        in: 'query',
        description: 'First Name',
        example: 'Julius'
      }
      #swagger.parameters['lastName'] = {
        in: 'query',
        description: 'Last Name',
        example: 'Caesar'
      }
      #swagger.parameters['email'] = {
        in: 'query',
        description: 'Email',
        example: 'julius.caesar@email.com'
      }
      #swagger.parameters['guid'] = {
        in: 'query',
        description: 'Guid',
        example: '1ef111deb11e4ba1ab11c0111a1110b0'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/user' }] }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */

    try {
      const { environment } = req.params;
      const result = await userController.listCommonUsers(environment, 'idir', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/:environment/azure-idir/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Users']
      #swagger.path = '/{environment}/azure-idir/users'
      #swagger.method = 'get'
      #swagger.description = 'Get list of users for Azure IDIR by query for target environment  <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore firstName, lastName, and email query params'
      #swagger.summary = 'Get list of users for Azure IDIR by query'

      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['firstName'] = {
        in: 'query',
        description: 'First Name',
        example: 'Julius'
      }
      #swagger.parameters['lastName'] = {
        in: 'query',
        description: 'Last Name',
        example: 'Caesar'
      }
      #swagger.parameters['email'] = {
        in: 'query',
        description: 'Email',
        example: 'julius.caesar@email.com'
      }
      #swagger.parameters['guid'] = {
        in: 'query',
        description: 'Guid',
        example: '1ef111deb11e4ba1ab11c0111a1110b0'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/user' }] }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */

    try {
      const { environment } = req.params;
      const result = await userController.listCommonUsers(environment, 'azureidir', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/:environment/github/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Users']
      #swagger.path = '/{environment}/github/users'
      #swagger.method = 'get'
      #swagger.description = 'Get list of users for GitHub by query for target environment <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore firstName, lastName, and email query params'
      #swagger.summary = 'Get list of users for GitHub by query'

      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['firstName'] = {
        in: 'query',
        description: 'First Name',
        example: 'Julius'
      }
      #swagger.parameters['lastName'] = {
        in: 'query',
        description: 'Last Name',
        example: 'Caesar'
      }
      #swagger.parameters['email'] = {
        in: 'query',
        description: 'Email',
        example: 'julius.caesar@email.com'
      }
      #swagger.parameters['guid'] = {
        in: 'query',
        description: 'Guid',
        example: '1ef111deb11e4ba1ab11c0111a1110b0'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/user' }] }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */

    try {
      const { environment } = req.params;
      const result = await userController.listCommonUsers(environment, 'github', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/:environment/basic-bceid/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Users']
      #swagger.path = '/{environment}/basic-bceid/users'
      #swagger.method = 'get'
      #swagger.description = 'Get list of users for Basic Bceid by query for target environment'
      #swagger.summary = 'Get list of users for Basic BCeID by query'

      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['guid'] = {
        in: 'query',
        required: true,
        description: 'Guid',
        example: '1ef111deb11e4ba1ab11c0111a1110b0'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/user' }] }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */

    try {
      const { environment } = req.params;
      const result = await userController.listBceidUsers(environment, 'bceidbasic', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/:environment/business-bceid/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Users']
      #swagger.path = '/{environment}/business-bceid/users'
      #swagger.method = 'get'
      #swagger.description = 'Get list of users for Business BCeID by query for target environment'
      #swagger.summary = 'Get list of users for Business BCeID by query'

      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['guid'] = {
        in: 'query',
        required: true,
        description: 'Guid',
        example: '1ef111deb11e4ba1ab11c0111a1110b0'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/user' }] }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */

    try {
      const { environment } = req.params;
      const result = await userController.listBceidUsers(environment, 'bceidbusiness', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/:environment/basic-business-bceid/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Users']
      #swagger.path = '/{environment}/basic-business-bceid/users'
      #swagger.method = 'get'
      #swagger.description = 'Get list of users for Basic or Business BCeID by query for target environment'
      #swagger.summary = 'Get list of users for Basic or Business BCeID by query'

      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['guid'] = {
        in: 'query',
        required: true,
        description: 'Guid',
        example: '1ef111deb11e4ba1ab11c0111a1110b0'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { data: [{ $ref: '#/components/schemas/user' }] }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { message: 'string' }
      }
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */

    try {
      const { environment } = req.params;
      const result = await userController.listBceidUsers(environment, 'bceidboth', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });
};
