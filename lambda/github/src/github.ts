const { Octokit } = require('octokit');
import { FormattedData } from '../../shared/interfaces';
import { stringifyGithubInputs } from './helpers';

const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

export const dispatchPullRequest = async (formData: FormattedData) => {
  console.log('requesting github request workflow', stringifyGithubInputs(formData));

  try {
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
      owner: process.env.GH_OWNER,
      repo: process.env.GH_REPO,
      workflow_id: process.env.GH_WORKFLOW_ID,
      ref: process.env.GH_BRANCH,
      inputs: stringifyGithubInputs(formData),
    });
  } catch (err) {
    console.log(err);
  }
};
