import { models } from '../../../shared/sequelize/models/models';

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
