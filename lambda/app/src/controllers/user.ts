import { Op, literal } from 'sequelize';
import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { kebabCase } from 'lodash';
import { fetchClient } from '../keycloak/client';

export const findOrCreateUser = async (session: Session) => {
  const { idir_userid, email } = session;

  const result = await models.user.findOne({ where: { idirUserid: idir_userid } });
  if (result) {
    // make sure the idir email is up-to-date for the account
    const updated = await models.user.update(
      { idirEmail: email },
      { where: { idirUserid: idir_userid }, returning: true, plain: true },
    );

    if (updated.length < 2) {
      throw Error('update failed');
    }

    return updated[1].dataValues;
  }

  const newuser = await models.user.create({ idirUserid: idir_userid, idirEmail: email });
  return newuser.dataValues;
};
