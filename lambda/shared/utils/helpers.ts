import isNil from 'lodash.isnil';
import compact from 'lodash.compact';
import { getUserById } from '@lambda-app/queries/user';
import { User } from '../interfaces';

interface Request {
  userId: number;
}

export const getEmailList = async (request: Request) => {
  const owner: User = !isNil(request.userId) && (await getUserById(request.userId));
  return compact([owner.idirEmail, owner.additionalEmail]);
};
