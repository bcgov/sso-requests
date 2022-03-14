import { Op } from 'sequelize';
import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { lowcase } from '@lambda-app/helpers/string';
import { getDisplayName } from '../utils/helpers';

export const findOrCreateUser = async (session: Session) => {
  let { idir_userid, email } = session;
  const displayName = getDisplayName(session);
  email = lowcase(email);

  let user = await models.user.findOne({ where: { [Op.or]: [{ idirEmail: email }, { idirUserid: idir_userid }] } });

  if (user) {
    // make sure the idir email is up-to-date for the account
    user.idirUserid = idir_userid;
    user.idirEmail = email;
    user.displayName = displayName;

    await user.save();
  } else {
    user = await models.user.create({ idirUserid: idir_userid, idirEmail: email, displayName });
  }

  return user.get({ plain: true });
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
