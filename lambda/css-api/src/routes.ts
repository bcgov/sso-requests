import { Auth, authenticate } from './authenticate';
import isString from 'lodash.isstring';
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

const tryJSON = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

const handleError = (res, err) => {
  let message = err.message || err;
  if (isString(message)) {
    message = tryJSON(message);
  }
  res.status(err.status || 422).json({ message });
};

const integrationController = container.resolve(IntegrationController);
const roleController = container.resolve(RoleController);
const userRoleMappingController = container.resolve(UserRoleMappingController);
const tokenController = container.resolve(TokenController);
const userController = container.resolve(UserController);

export const setRoutes = (app: any) => {
  app.options('(.*)', async (req, res) => {
    res.status(200).json(null);
  });

  app.get(`/heartbeat`, async (req, res) => {
    //#swagger.ignore = true
    try {
      const result = await wakeUpAll();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/token`, async (req, res) => {
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
    console.log(auth);

    if (!auth.success) {
      res.status(401).json(auth);
      return false;
    } else {
      req.teamId = auth.data.teamId;
    }
    if (next) next();
  });

  app.get(`/verify-token`, async (req, res) => {
    //#swagger.ignore = true
    try {
      res.status(200).json({ teamId: req.teamId });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/integrations`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Integrations']
      #swagger.path = '/integrations'
      #swagger.method = 'get'
      #swagger.description = 'Get all Gold standard integrations created by the team'
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

  app.get(`/integrations/:integrationId`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Integrations']
      #swagger.path = '/integrations/{integrationId}'
      #swagger.method = 'get'
      #swagger.description = 'Get a Gold standard integration by ID'
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

  app.get(`/integrations/:integrationId/:environment/roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles'
      #swagger.method = 'get'
      #swagger.description = 'Get roles created for the integration of the target environment'
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

  app.get(`/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'get'
      #swagger.description = 'Get a role created for the integration of the target environment'
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

  app.post(`/integrations/:integrationId/:environment/roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles'
      #swagger.method = 'post'
      #swagger.description = 'Create a role for the integration of the target environment'
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

  app.put(`/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'put'
      #swagger.description = 'Update a role created for the integration of the target environment'
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
        schema: { $ref: '#/components/schemas/updatedRoleRequest' }
        }
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
          name: 'updated-client-role',
          composite: false
        }
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

  app.delete(`/integrations/:integrationId/:environment/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}'
      #swagger.method = 'delete'
      #swagger.description = 'Delete a role created for the integration of the target environment'
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

  app.get(`/integrations/:integrationId/:environment/roles/:roleName/composite-roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles'
      #swagger.method = 'get'
      #swagger.description = 'Get all composite roles of a role for the integration of the target environment'
      #swagger.summary = 'Get all composites of a role'
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
        schema: { data: [{ $ref: '#/components/schemas/compositeRoleResponse' }] }
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
    `/integrations/:integrationId/:environment/roles/:roleName/composite-roles/:compositeRoleName`,
    async (req, res) => {
      /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles/{compositeRoleName}'
      #swagger.method = 'get'
      #swagger.description = 'Get a composite role from a role for the integration of the target environment'
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
        example: 'composite-role'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
          name: 'composite-role',
          composite: false
        }
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

  app.post(`/integrations/:integrationId/:environment/roles/:roleName/composite-roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles'
      #swagger.method = 'post'
      #swagger.description = 'Add composite roles into a role for the integration of the target environment'
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
        schema: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/compositeRoleRequest'
          }
        }
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
          name: 'client-role',
          composite: true,
        }
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
      const { integrationId, environment, roleName } = req.params;
      const result = await roleController.createComposite(req.teamId, integrationId, roleName, environment, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(
    `/integrations/:integrationId/:environment/roles/:roleName/composite-roles/:compositeRoleName`,
    async (req, res) => {
      /*#swagger.auto = false
      #swagger.tags = ['Roles']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles/{compositeRoleName}'
      #swagger.method = 'delete'
      #swagger.description = 'Delete a composite role from a role for the integration of the target environment'
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
        example: 'composite-role'
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

  app.get(`/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    /*
      #swagger.deprecated = true
      #swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/user-role-mappings'
      #swagger.method = 'get'
      #swagger.description = 'Get user-role mappings by a role name or a username for the integration of the target environment <br><br> <b>Note:</b> Either roleName or username is required'
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

  app.post(`/integrations/:integrationId/:environment/user-role-mappings`, async (req, res) => {
    /*#swagger.deprecated = true
      #swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/user-role-mappings'
      #swagger.method = 'post'
      #swagger.description = 'Create or delete a user-role mapping for the integration of the target environment'
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

  app.get(`/:environment/idir/users`, async (req, res) => {
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
        example: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
            data: [
            {
              username: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67@idir',
              email: 'julius-caesar@email.com',
              firstName: 'Julius',
              lastName: 'Caesar',
              attributes: {
                display_name: ['Julius Caesar'],
                idir_user_guid: ['fohe4m5pn8clhkxmlho33sn1r7vr7m67'],
                idir_username: ['JULIUSCA']
              },
            }
          ]
        }
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
      const result = await userController.listUsers(environment, 'idir', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/:environment/azure-idir/users`, async (req, res) => {
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
        example: 'uuz6y6mggxgfdhcqxm6kjho19krg7xle'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
            data: [
            {
              username: 'uuz6y6mggxgfdhcqxm6kjho19krg7xle@azureidir',
              email: 'julius-caesar@email.com',
              firstName: 'Julius',
              lastName: 'Caesar',
              attributes: {
                display_name: ['Julius Caesar'],
                idir_user_guid: ['uuz6y6mggxgfdhcqxm6kjho19krg7xle'],
                idir_username: ['JULIUSCA']
              },
            }
          ]
        }
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
      const result = await userController.listUsers(environment, 'azureidir', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/:environment/github-bcgov/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Users']
      #swagger.path = '/{environment}/github-bcgov/users'
      #swagger.method = 'get'
      #swagger.description = 'Get list of users for GitHub bcgov by query for target environment <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore name, login, and email query params'
      #swagger.summary = 'Get list of users for GitHub bcgov by query'

      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['name'] = {
        in: 'query',
        description: 'Full Name',
        example: 'Julius Caesar'
      }
      #swagger.parameters['login'] = {
        in: 'query',
        description: 'GitHub Login',
        example: 'juliuscaesar'
      }
      #swagger.parameters['email'] = {
        in: 'query',
        description: 'Email',
        example: 'julius.caesar@email.com'
      }
      #swagger.parameters['guid'] = {
        in: 'query',
        description: 'Guid',
        example: 'vbnck6ivt91hag6g1xnuvdgp0lyuebl3'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
            data: [
            {
              username: 'vbnck6ivt91hag6g1xnuvdgp0lyuebl3@githubbcgov',
              email: 'julius-caesar@email.com',
              firstName: '',
              lastName: '',
              attributes: {
                github_username: [
                  "julius-caesar"
                ],
                github_id: [
                  "12345678"
                ],
                org_verified: [
                  "false"
                ],
                display_name: [
                  "Julius Caesar"
                ]
              },
            }
          ]
        }
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
      const result = await userController.listUsers(environment, 'githubbcgov', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/:environment/github-public/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Users']
      #swagger.path = '/{environment}/github-public/users'
      #swagger.method = 'get'
      #swagger.description = 'Get list of users for GitHub public by query for target environment <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore name, login, and email query params'
      #swagger.summary = 'Get list of users for GitHub public by query'

      #swagger.parameters['environment'] = {
        in: 'path',
        description: 'Environment',
        required: true,
        schema: { $ref: '#/components/schemas/environment' }
      }
      #swagger.parameters['name'] = {
        in: 'query',
        description: 'Full Name',
        example: 'Julius Caesar'
      }
      #swagger.parameters['login'] = {
        in: 'query',
        description: 'GitHub Login',
        example: 'juliuscaesar'
      }
      #swagger.parameters['email'] = {
        in: 'query',
        description: 'Email',
        example: 'julius.caesar@email.com'
      }
      #swagger.parameters['guid'] = {
        in: 'query',
        description: 'Guid',
        example: 'b7valkf9208yudxfmr026wv6jhugwkht'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
            data: [
            {
              username: 'b7valkf9208yudxfmr026wv6jhugwkht@githubpublic',
              email: 'julius-caesar@email.com',
              firstName: '',
              lastName: '',
              attributes: {
                github_username: [
                  "julius-caesar"
                ],
                github_id: [
                  "12345678"
                ],
                org_verified: [
                  "false"
                ],
                display_name: [
                  "Julius Caesar"
                ]
              },
            }
          ]
        }
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
      const result = await userController.listUsers(environment, 'githubpublic', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/:environment/basic-bceid/users`, async (req, res) => {
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
        example: 'tb914nlltlo4mz05viha1b4hdyi4xnad'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
            data: [
            {
              username: 'tb914nlltlo4mz05viha1b4hdyi4xnad@bceidbasic',
              email: 'julius-caesar@email.com',
              firstName: 'Julius',
              lastName: 'Caesar',
              attributes: {
                display_name: ['Julius Caesar'],
                bceid_user_guid: ['tb914nlltlo4mz05viha1b4hdyi4xnad'],
                bceid_username: ['JULIUSCA']
              },
            }
          ]
        }
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
      const result = await userController.listUsers(environment, 'bceidbasic', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/:environment/business-bceid/users`, async (req, res) => {
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
        example: '1r1zui4qr1yfh73k6rku5q30qupgcvdt'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
            data: [
            {
              username: '1r1zui4qr1yfh73k6rku5q30qupgcvdt@bceidbusiness',
              email: 'julius-caesar@email.com',
              firstName: 'Julius',
              lastName: 'Caesar',
              attributes: {
                bceid_business_guid: ['4t64xgki1pxqx61jxvri3i4uie1u61nk'],
                bceid_business_name: ['Julius Caesars Business Team'],
                display_name: ['Julius Caesar'],
                bceid_user_guid: ['1r1zui4qr1yfh73k6rku5q30qupgcvdt'],
                bceid_username: ['JULIUSCA']
              },
            }
          ]
        }
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
      const result = await userController.listUsers(environment, 'bceidbusiness', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/:environment/basic-business-bceid/users`, async (req, res) => {
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
        example: 'jj4vrfekurtzc2931k8mroqx3fgibrr3'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: {
            data: [
            {
              username: 'jj4vrfekurtzc2931k8mroqx3fgibrr3@bceidboth',
              email: 'julius-caesar@email.com',
              firstName: 'Julius',
              lastName: 'Caesar',
              attributes: {
                bceid_business_guid: ['qplo4aqoffy2njxsaj8wwfa3qe6g3s40'],
                bceid_business_name: ['Julius Caesars Business Team'],
                display_name: ['Julius Caesar'],
                bceid_user_guid: ['jj4vrfekurtzc2931k8mroqx3fgibrr3'],
                bceid_username: ['JULIUSCA']
              },
            }
          ]
        }
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
      const result = await userController.listUsers(environment, 'bceidboth', req.query);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/integrations/:integrationId/:environment/users/:username/roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/users/{username}/roles'
      #swagger.method = 'get'
      #swagger.description = 'Get roles associated with user for the integration of the target environment'
      #swagger.summary = 'Get roles associated with user'
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
      #swagger.parameters['username'] = {
        in: 'path',
        description: 'Username',
        required: true,
        example: 'jj4vrfekurtzc2931k8mroqx3fgibrr3@idir'
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
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment, idp, username } = req.params;
      const result = await userRoleMappingController.listRolesByUsername(
        req.teamId,
        integrationId,
        environment,
        username,
      );
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/integrations/:integrationId/:environment/roles/:roleName/users`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/roles/{roleName}/users'
      #swagger.method = 'get'
      #swagger.description = 'Get users associated with role for the integration of the target environment'
      #swagger.summary = 'Get users associated with role'
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
      #swagger.parameters['page'] = {
        in: 'query',
        description: 'Page',
        default: '1'
      }
      #swagger.parameters['max'] = {
        in: 'query',
        description: 'Max Count',
        default: '50'
      }
      #swagger.responses[200] = {
        description: 'OK',
        schema: { page: 1, data: [{ $ref: '#/components/schemas/user' }] }
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
      const { integrationId, environment, roleName } = req.params;
      const result = await userRoleMappingController.listUsersByRolename(
        req.teamId,
        integrationId,
        environment,
        roleName,
        req.query,
      );
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/integrations/:integrationId/:environment/users/:username/roles`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/users/{username}/roles'
      #swagger.method = 'post'
      #swagger.description = 'Assign roles to a user for the integration of the target environment'
      #swagger.summary = 'Assign roles to a user'
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
      #swagger.parameters['username'] = {
        in: 'path',
        description: 'Username',
        required: true,
        example: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67@idir'
      }
      #swagger.requestBody = {
        required: true,
        schema: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/roleRequest'
          }
        }
      }
      #swagger.responses[201] = {
        description: 'Created',
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
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment, username } = req.params;
      const result = await userRoleMappingController.addRoleToUser(
        req.teamId,
        integrationId,
        environment,
        username,
        req.body,
      );
      res.status(201).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`/integrations/:integrationId/:environment/users/:username/roles/:roleName`, async (req, res) => {
    /*#swagger.auto = false
      #swagger.tags = ['Role-Mapping']
      #swagger.path = '/integrations/{integrationId}/{environment}/users/{username}/roles/{roleName}'
      #swagger.method = 'delete'
      #swagger.description = 'Unassign role from a user for the integration of the target environment'
      #swagger.summary = 'Unassign role from a user'
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
      #swagger.parameters['username'] = {
        in: 'path',
        description: 'Username',
        required: true,
        example: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67@idir'
      }
      #swagger.parameters['roleName'] = {
        in: 'path',
        description: 'Role name',
        required: true,
        example: 'client-role'
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
      #swagger.responses[422] = {
        description: 'Unprocessable Entity',
        schema: {message: 'string'}
      }
    */
    try {
      if (!isEmpty(req.query)) throw new createHttpError[400]('invalid request');
      const { integrationId, environment, username, roleName } = req.params;
      const result = await userRoleMappingController.deleteRoleFromUser(
        req.teamId,
        integrationId,
        environment,
        username,
        roleName,
      );
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  });
};
