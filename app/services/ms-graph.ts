import { instance } from './axios';
import { IdirUser } from './bceid-webservice';

export const searchAzureIdirUsers = async ({
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
      .post('ms-graph/idir/search', { field, search, integrationId, environment })
      .then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error('Failed to search Azure IDIR users from Graph API:', err);
    return [null, err];
  }
};

export const importAzureIdirUser = async (data: any, integrationId: number, environment: string) => {
  try {
    await instance.post('ms-graph/idir/import', { ...data, integrationId, environment }).then((res) => res.data);
  } catch (err: any) {
    console.error('Failed to import Azure IDIR user from Graph API:', err);
    throw err;
  }
};
