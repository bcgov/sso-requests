import { FormattedData } from '../../shared/interfaces';
import { dispatchPullRequest } from './github';

export const handler = async (event: FormattedData) => {
  try {
    await dispatchPullRequest(event);
  } catch (err) {
    console.error(err);
  }
};
