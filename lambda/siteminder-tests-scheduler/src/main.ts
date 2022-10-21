import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { Octokit } from '@octokit/rest';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  try {
    const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

    const triggerDispatch = (workflow_id: string, inputs: any) =>
      octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: process.env.GH_OWNER,
        repo: 'sso-keycloak',
        workflow_id,
        ref: 'dev',
        inputs,
      });

    const data = await Promise.all([
      triggerDispatch('siteminder-tests.yml', { environment: 'dev', cluster: 'gold' }),
      triggerDispatch('siteminder-tests.yml', { environment: 'test', cluster: 'gold' }),
      triggerDispatch('siteminder-tests.yml', { environment: 'prod', cluster: 'gold' }),
    ]);

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
