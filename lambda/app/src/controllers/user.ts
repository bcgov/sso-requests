import { Op } from 'sequelize';
import isNil from 'lodash/isNil';
import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { lowcase } from '@lambda-app/helpers/string';
import { getDisplayName } from '../utils/helpers';

export const findOrCreateUser = async (session: Session) => {
  let { idir_userid, email } = session;
  const displayName = getDisplayName(session);
  email = lowcase(email);

  const conditions = [];
  if (email) conditions.push({ idirEmail: email });
  if (idir_userid) conditions.push({ idirUserid: idir_userid });

  let user = await models.user.findOne({ where: { [Op.or]: conditions } });

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

export const updateProfile = async (
  session: Session,
  data: { additionalEmail?: string; hasReadGoldNotification?: boolean },
) => {
  const { user } = session;
  const myself = await models.user.findOne({ where: { id: user.id } });

  if (!isNil(data.additionalEmail)) myself.additionalEmail = lowcase(data.additionalEmail);
  if (!isNil(data.hasReadGoldNotification)) myself.hasReadGoldNotification = data.hasReadGoldNotification;
  const updated = await myself.save();

  if (!updated) {
    throw Error('update failed');
  }

  return updated.get({ plain: true });
};
