import { sequelize, models } from '@app/shared/sequelize/models/models';
import { Op, Transaction } from 'sequelize';

export const getRolesWithEnvironments = async (integrationId: number) => {
  const [results] = await sequelize.query(
    'select name, array_agg(environment) as envs from request_roles where request_id = :integrationId group by name;',
    {
      replacements: { integrationId },
      raw: true,
    },
  );
  return results;
};

export const createCompositeRolesDB = async (
  roleName: string,
  compositeRoleNames: string[],
  integrationId: number,
  environment: string,
  transaction?: Transaction,
) => {
  let dbRole = await models.requestRole.findOne({
    where: {
      name: roleName,
      requestId: integrationId,
      environment: environment,
    },
    transaction,
  });

  if (!dbRole) {
    dbRole = await models.requestRole.create(
      {
        name: roleName,
        environment: environment,
        requestId: integrationId,
      },
      { transaction },
    );
  }
  const dbCompositeRoles = await models.requestRole.findAll({
    where: {
      name: {
        [Op.in]: compositeRoleNames,
      },
      requestId: integrationId,
      environment: environment,
    },
    raw: true,
    transaction,
  });
  for (const compRole of compositeRoleNames) {
    const compRoleId = dbCompositeRoles.find((cr: any) => cr.name === compRole).id;
    if (!dbRole.compositeRoles.includes(compRoleId)) dbRole.compositeRoles = dbRole.compositeRoles.concat(compRoleId);
    if (!dbRole.composite) dbRole.composite = true;
  }

  return await dbRole.save({ transaction });
};

export const deleteCompositeRolesDB = async (
  roleName: string,
  compositeRoleName: string,
  integrationId: number,
  environment: string,
) => {
  const dbRole = await models.requestRole.findOne({
    where: {
      name: roleName,
      requestId: integrationId,
      environment: environment,
    },
  });

  if (dbRole) {
    const dbCompositeRole = await models.requestRole.findOne({
      where: {
        name: compositeRoleName,
        requestId: integrationId,
        environment: environment,
      },
      raw: true,
    });

    if (dbCompositeRole) {
      const updatedComposites = dbRole.compositeRoles.filter((cr: any) => cr !== dbCompositeRole.id);

      dbRole.compositeRoles = updatedComposites;

      if (updatedComposites.length === 0) {
        dbRole.composite = false;
      }
      return await dbRole.save();
    }
  }
};

export const getCompositeParentRoles = async (
  roleName: string,
  integrationId: number,
  environment: string,
  transaction?: Transaction,
) => {
  const [results] = await sequelize.query(
    'select * from request_roles where (select id from request_roles where name = :roleName and environment = :environment and request_id = :integrationId) = ANY(composite_roles) and request_id = :integrationId and environment = :environment;',
    {
      replacements: { integrationId, roleName, environment },
      raw: true,
      transaction,
    },
  );
  return results;
};

export const destroyRequestRole = async (
  integrationId: number,
  roleName: string,
  environment: string,
  transaction?: Transaction,
) => {
  const dbRole = await models.requestRole.findOne({
    where: {
      name: roleName,
      requestId: integrationId,
      environment: environment,
    },
    transaction,
  });

  if (dbRole) {
    const parentRoles: any = await getCompositeParentRoles(roleName, integrationId, environment, transaction);

    for (const prole of parentRoles) {
      await models.requestRole.update(
        {
          composite: prole.composite_roles?.length === 1 ? false : true,
          compositeRoles: prole.composite_roles.filter((p: any) => p != dbRole?.id),
        },
        {
          where: {
            name: prole?.name,
            requestId: integrationId,
            environment: environment,
          },
          transaction,
        },
      );
    }

    await dbRole.destroy({ transaction });
  }
};
