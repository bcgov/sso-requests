import { models } from '@lambda-shared/sequelize/models/models';
import { getIntegrationsByTeam } from '@lambda-app/queries/request';

const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

export const fetchIntegrationsOfTeam = async (teamId) => {
  return await getIntegrationsByTeam(teamId, 'gold');
};
