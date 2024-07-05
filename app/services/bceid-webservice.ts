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
}: {
  field: string;
  search: string;
}): Promise<(IdirUser[] | null)[]> => {
  try {
    const result = await instance.post('bceid-webservice/idir/search', { field, search }).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const importIdirUser = async ({ guid, userId }: { guid: string; userId: string }): Promise<(any | null)[]> => {
  try {
    const result = await instance.post('bceid-webservice/idir/import', { guid, userId }).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};
