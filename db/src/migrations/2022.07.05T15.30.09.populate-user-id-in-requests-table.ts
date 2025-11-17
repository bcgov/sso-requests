import { models } from '@app/shared/sequelize/models/models';

export const name = '2022.07.05T15.30.09.populate-user-id-in-requests-table';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  const integrations = await models.request.findAll({ attributes: ['id', 'userId', 'idirUserid'] });
  await Promise.all(
    integrations.map(async (integration) => {
      if (integration.userId) return;

      const user = await models.user.findOne({ where: { idirUserid: integration.idirUserid }, attributes: ['id'] });
      if (user) {
        integration.userId = user.id;
        await integration.save();
      }
    }),
  );
};

export const down = async ({ context: sequelize }) => {};

export default { name, up, down };
