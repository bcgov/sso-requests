import { instance } from './axios';
import { AxiosError } from 'axios';
import { handleAxiosError } from 'services/axios';
import * as XLSX from 'xlsx';
import { downloadText, prettyJSON } from '@app/utils/text';

var newDate = new Date();
var currentDate = `${newDate.getFullYear()}${
  newDate.getMonth() + 1
}${newDate.getDate()}${newDate.getHours()}${newDate.getMinutes()}`;

export const downloadAllStandardIntegrationsReport = async (): Promise<[true, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-standard-integrations').then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, 'All standard integrations');
    XLSX.writeFile(workBook, `all-standard-integrations-${currentDate}.xlsx`);
    return [true, null];
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};

export const downloadDatabaseReport = async (
  type: string,
  orderBy: string,
): Promise<[true, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/database-tables', { params: { type, orderBy } }).then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, `All ${type}`);
    XLSX.writeFile(workBook, `all-${type.toLowerCase()}-${currentDate}.xlsx`);
    return [true, null];
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};

export const downloadAllBceidApprovedRequestsAndEventsReport = async (): Promise<[true, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-bceid-approved-requests-and-events').then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, 'All BCeID Approved Reqs&Events');
    XLSX.writeFile(workBook, `all-bceid-approved-requests-and-events-${currentDate}.xlsx`);
    return [true, null];
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};

export const downloadIntegrationDataIntegrityReport = async (): Promise<[true, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/data-integrity').then((res) => res.data);
    downloadText(prettyJSON(result), `sso-css-data-integrity-${new Date().getTime()}.json`);
    return [true, null];
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};
