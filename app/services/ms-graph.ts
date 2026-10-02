import { instance } from './axios';
import { IdirUser } from './bceid-webservice';

export const searchAzureIdirUsers = async ({
  field,
  search,
  idp,
}: {
  field: string;
  search: string;
  idp: string;
}): Promise<(IdirUser[] | null)[]> => {
  try {
    const result = await instance.post('ms-graph/idir/search', { field, search, idp }).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error('Failed to search Azure IDIR users from Graph API:', err);
    return [null, err];
  }
};

export const importAzureIdirUser = async ({
  guid,
  userId,
  idirGuid,
  idp,
}: {
  guid: string;
  userId: string;
  idirGuid: string;
  idp: string;
}) => {
  try {
    await instance.post(`ms-graph/idir/import`, { guid, userId, idirGuid, idp }).then((res) => res.data);
  } catch (err: any) {
    console.error('Failed to import Azure IDIR user from Graph API:', err);
    throw err;
  }
};
