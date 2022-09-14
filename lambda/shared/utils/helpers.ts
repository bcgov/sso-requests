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

export const realmToIDP = (realm?: string) => {
  let idps: string[] = [];
  if (realm === 'onestopauth') idps = ['idir'];
  if (realm === 'onestopauth-basic') idps = ['idir', 'bceid-basic'];
  if (realm === 'onestopauth-business') idps = ['idir', 'bceid-business'];
  if (realm === 'onestopauth-both') idps = ['idir', 'bceid-business', 'bceid-basic'];
  return idps;
};
