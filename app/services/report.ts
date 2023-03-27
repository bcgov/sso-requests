import { instance } from './axios';
import { AxiosError } from 'axios';
import { parse } from 'json2csv';
import { handleAxiosError } from 'services/axios';
import { downloadText } from 'utils/text';

export const downloadAllStandardIntegrationsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-standard-integrations').then((res) => res.data);

    const options = result.length > 0 ? {} : { fields: [] };
    downloadText(parse(result, options), 'All Standard Integrations.xls', 'application/vnd.ms-excel');
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};
