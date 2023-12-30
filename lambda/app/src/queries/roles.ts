import { sequelize, models } from '../../../shared/sequelize/models/models';

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
