import { instance } from './axios';
import { AxiosError } from 'axios';
import { handleAxiosError } from 'services/axios';
import * as XLSX from 'xlsx';

var newDate = new Date();
var currentDate = `${newDate.getFullYear()}${
  newDate.getMonth() + 1
}${newDate.getDate()}${newDate.getHours()}${newDate.getMinutes()}`;

export const downloadAllStandardIntegrationsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-standard-integrations').then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, 'All standard integrations');
    XLSX.writeFile(workBook, `All-Standard-Integrations-${currentDate}.xlsx`);
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};

export const downloadDatabaseReport = async (type: string, orderBy: string): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/database-tables', { params: { type, orderBy } }).then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, `All ${type}`);
    XLSX.writeFile(workBook, `all-${type.toLowerCase()}-${currentDate}.xlsx`);
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};
