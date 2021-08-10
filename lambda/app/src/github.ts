// migrate GitHub lambda here and call GitHub API directly to avoid multiple invocations.
// see https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
const { Octokit } = require('octokit');
import { stringifyGithubInputs } from './helpers';

const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

interface ValidRedirectUris {
  dev: string[];
  test: string[];
  prod: string[];
}
interface GitHubRequestDispatchInput {
  requestId: number;
  clientName: string;
  realmName: string;
  validRedirectUris: ValidRedirectUris;
  environments: string[];
  publicAccess: boolean;
}

export const dispatchRequestWorkflow = async (formData: GitHubRequestDispatchInput) => {
  console.log('requesting github request workflow', stringifyGithubInputs(formData));

  return await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
    owner: process.env.GH_OWNER,
    repo: process.env.GH_REPO,
    workflow_id: process.env.GH_WORKFLOW_ID,
    ref: process.env.GH_BRANCH,
    inputs: stringifyGithubInputs(formData),
  });
};
