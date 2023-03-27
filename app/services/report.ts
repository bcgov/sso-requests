import { instance } from './axios';
import { AxiosError } from 'axios';
import { parse } from 'json2csv';
import { handleAxiosError } from 'services/axios';

const XLSX = require('xlsx');

export const downloadAllStandardIntegrationsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-standard-integrations').then((res) => res.data);

    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = {
      Sheets: {
        data: worksheet,
      },
      SheetNames: ['data'],
    };
    XLSX.writeFile(workbook, 'All Standard Integrations.xlsx');
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};
