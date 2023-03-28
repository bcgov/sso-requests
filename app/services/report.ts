import { instance } from './axios';
import { AxiosError } from 'axios';
import { handleAxiosError } from 'services/axios';
import * as XLSX from 'xlsx';

export const downloadAllStandardIntegrationsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-standard-integrations').then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = {
      Sheets: {
        data: workSheet,
      },
      SheetNames: ['All standard integration'],
    };
    XLSX.writeFile(workBook, 'All Standard Integrations.xlsx');
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};
