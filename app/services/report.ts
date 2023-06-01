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

export const downloadAllRequestsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-requests').then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, 'All Requests');
    XLSX.writeFile(workBook, `All-Requests-${currentDate}.xlsx`);
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};

export const downloadAllUsersReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-users').then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, 'All Users');
    XLSX.writeFile(workBook, `All-Users-${currentDate}.xlsx`);
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};

export const downloadAllTeamsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-teams').then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, 'All Teams');
    XLSX.writeFile(workBook, `All-Teams-${currentDate}.xlsx`);
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};

export const downloadAllEventsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-events').then((res) => res.data);

    const workSheet = XLSX.utils.json_to_sheet(result);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, 'All Events');
    XLSX.writeFile(workBook, `All-Events-${currentDate}.xlsx`);
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};
