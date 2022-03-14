import { models } from '@lambda-shared/sequelize/models/models';

export const name = '2222.03.02T15.30.09.populate-user-id-in-requests-table';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  const integrations = await models.request.findAll({});
  await Promise.all(
    integrations.map(async (integration) => {
      if (integration.userId) return;

      const user = await models.user.findOne({ where: { idirUserid: integration.idirUserid } });
      if (user) {
        integration.userId = user.id;
        await integration.save();
      }
    }),
  );
};

export const down = async ({ context: sequelize }) => {};

export default { name, up, down };
