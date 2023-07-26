import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { Octokit } from '@octokit/rest';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  try {
    const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

    const triggerDispatch = (workflow_id) =>
      octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: process.env.GH_OWNER,
        repo: process.env.GH_REPO,
        workflow_id,
        ref: process.env.GH_BRANCH,
      });

    const data = await Promise.all([triggerDispatch(process.env.GH_WORKFLOW_V2_ID)]);

    const response = {
      statusCode: 200,
      headers: { time: new Date() },
      body: { success: true, data },
    };

    callback(null, response);
  } catch (err) {
    console.log('errored out', err);

    const response = {
      statusCode: 422,
      headers: { time: new Date() },
      body: { success: false, message: err?.message || err },
    };

    callback(err, response);
  }
};
