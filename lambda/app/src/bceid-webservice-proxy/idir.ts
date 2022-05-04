import axios from 'axios';
import { createIdirUser } from '../keycloak/users';

export const searchIdirUsers = async (bearerToken: string, { field, search }: { field: string; search: string }) => {
  const results = await axios
    .post(
      `${process.env.BCEID_WEBSERVICE_PROXY}/idir`,
      { field, search },
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      },
    )
    .then((res: any) => res.data);

  return results;
};

export const importIdirUser = async (bearerToken: string, { guid, userId }: { guid: string; userId: string }) => {
  const results = await axios
    .post(
      `${process.env.BCEID_WEBSERVICE_PROXY}/idir`,
      { field: 'userId', search: userId },
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      },
    )
    .then((res: any) => res.data);

  if (!results || results.length === 0) return false;
  const result = results.find((user) => user.guid === guid);
  if (!result) return false;

  await Promise.all(
    ['dev', 'test', 'prod'].map((env) =>
      createIdirUser({
        environment: env,
        guid: result.guid,
        userId: result.userId,
        email: result.contact.email,
        firstName: result.individualIdentity.name.firstname,
        lastName: result.individualIdentity.name.surname,
        displayName: result.displayName,
      }).catch(() => null),
    ),
  );

  return true;
};
