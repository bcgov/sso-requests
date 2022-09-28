import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { Octokit } from '@octokit/rest';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  try {
    const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

    const triggerDispatch = (workflow_id) =>
      octokit.request('POST /repos/{owner}/sso-keycloak/actions/workflows/siteminder-tests/dispatches', {
        owner: process.env.GH_OWNER,
        repo: 'sso-keycloak',
        workflow_id,
        ref: 'dev',
      });

    const data = await Promise.all([triggerDispatch('siteminder-tests.yml')]);

    const response = {
      statusCode: 200,
      headers: { time: new Date() },
      body: { success: true, data },
    };

    callback(null, response);
  } catch (err) {
    console.error('errored out', err);

    const response = {
      statusCode: 422,
      headers: { time: new Date() },
      body: { success: false, message: err?.message || err },
    };

    callback(err, response);
  }
};
