import { instance } from './axios';

export interface IdirUser {
  company: string;
  phone: string;
  department: string;
  jobTitle: string;
  userId: string;
  guid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

export const searchIdirUsers = async ({
  field,
  search,
  integrationId,
  environment,
}: {
  field: string;
  search: string;
  integrationId: number;
  environment: string;
}): Promise<(IdirUser[] | null)[]> => {
  try {
    const result = await instance
      .post('bceid-webservice/idir/search', { field, search, integrationId, environment })
      .then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error('Failed to search IDIR users from BCEID webservice:', err);
    return [null, err];
  }
};

export const importIdirUser = async (data: any, integrationId: number, environment: string) => {
  try {
    await instance
      .post('bceid-webservice/idir/import', { ...data, integrationId, environment })
      .then((res) => res.data);
  } catch (err: any) {
    console.error('Failed to import IDIR user from BCEID webservice:', err);
    throw err;
  }
};
