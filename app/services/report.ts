import { instance } from './axios';
import { AxiosError } from 'axios';
import { handleAxiosError } from 'services/axios';
import { downloadText, prettyJSON } from '@app/utils/text';
import { dateTimeStringForFileName, generateXlsx } from '@app/utils/helpers';

const currentDate = dateTimeStringForFileName();

export const downloadAllStandardIntegrationsReport = async (): Promise<[true, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-standard-integrations').then((res) => res.data);

    generateXlsx(result, `all-standard-integrations-${currentDate}`, 'All standard integrations');

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

    generateXlsx(result, `all-${type.toLowerCase()}-${currentDate}`, `All ${type}`);

    return [true, null];
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};

export const downloadAllBceidApprovedRequestsAndEventsReport = async (): Promise<[true, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/all-bceid-approved-requests-and-events').then((res) => res.data);

    generateXlsx(result, `all-bceid-approved-requests-and-events-${currentDate}`, 'All BCeID Approved Reqs&Events');

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
