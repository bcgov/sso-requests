import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { lowcase } from '@lambda-app/helpers/string';

// TODO: refactor here
export const findOrCreateUser = async (session: Session) => {
  let { idir_userid, email } = session;
  email = lowcase(email);

  const userFromId = await models.user.findOne({ where: { idirUserid: idir_userid } });

  if (userFromId) {
    // make sure the idir email is up-to-date for the account
    const updated = await models.user.update(
      { idirEmail: email },
      { where: { idirUserid: idir_userid }, returning: true, plain: true },
    );

    if (updated.length < 2) throw Error('update failed');
    return updated[1].dataValues;
  }

  const userFromEmail = await models.user.findOne({ where: { idirEmail: email } });
  if (userFromEmail) {
    const updated = await models.user.update(
      { idirUserid: idir_userid },
      { where: { idirEmail: email }, returning: true, plain: true },
    );

    if (updated.length < 2) throw Error('update failed');
    return updated[1].dataValues;
  }

  const newuser = await models.user.create({ idirUserid: idir_userid, idirEmail: email });
  return newuser.dataValues;
};

export const updateProfile = async (session: Session, data: { additionalEmail: string }) => {
  const { user } = session;
  const myself = await models.user.findOne({ where: { id: user.id } });

  myself.additionalEmail = lowcase(data.additionalEmail);
  const updated = await myself.save();

  if (!updated) {
    throw Error('update failed');
  }

  return updated.get({ plain: true });
};
