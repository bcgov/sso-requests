import { FormattedData } from '../../shared/interfaces';
import { dispatchPullRequest } from './github';

export const handler = async (event: string) => {
  const data: FormattedData = JSON.parse(event);
  try {
    await dispatchPullRequest(data);
  } catch (err) {
    console.error(err);
  }
};
