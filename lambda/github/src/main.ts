import { FormattedData } from '../../shared/interfaces';
import { dispatchPullRequest } from './github';

export const handler = async (data: FormattedData) => {
  try {
    await dispatchPullRequest(data);
  } catch (err) {
    console.error(err);
  }
};
