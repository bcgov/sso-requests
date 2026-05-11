import { instance } from './axios';
import { IdirUser } from './bceid-webservice';

export const searchAzureIdirUsers = async ({
  field,
  search,
}: {
  field: string;
  search: string;
}): Promise<(IdirUser[] | null)[]> => {
  try {
    const result = await instance.post('ms-graph/idir/search', { field, search }).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const importAzureIdirUser = async (data: any) => {
  try {
    const result = await instance.post('ms-graph/idir/import', data).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};
