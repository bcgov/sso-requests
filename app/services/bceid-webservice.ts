import { instance } from './axios';

export interface IdirUser {
  guid: string;
  userId: string;
  displayName: string;
  contact: {
    email: string;
    telephone: string;
  };
  individualIdentity: {
    name: {
      firstname: string;
      middleName: string;
      otherMiddleName: string;
      surname: string;
      initials: string;
    };
  };
  internalIdentity: {
    company: string;
    department: string;
    title: string;
    description: string;
    employeeId: string;
    office: string;
    organizationCode: string;
  };
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
