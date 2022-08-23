import { instance } from './axios';
import { AxiosError } from 'axios';
import { parse } from 'json2csv';
import { handleAxiosError } from 'services/axios';
import { downloadText } from 'utils/text';

export const downloadTeamIntegrationsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/team-integrations').then((res) => res.data);

    const options = result.length > 0 ? {} : { fields: [] };
    downloadText(parse(result, options), 'users_associated_with_team.csv', 'text/csv');
  } catch (err: any) {
    console.log(err);
    return handleAxiosError(err);
  }
};
export const downloadUserIntegrationsReport = async (): Promise<void | [null, AxiosError]> => {
  try {
    const result = await instance.get('reports/user-integrations').then((res) => res.data);

    const options = result.length > 0 ? {} : { fields: [] };
    downloadText(parse(result, options), 'users_associated_without_team.csv', 'text/csv');
  } catch (err: any) {
    return handleAxiosError(err);
  }
};
