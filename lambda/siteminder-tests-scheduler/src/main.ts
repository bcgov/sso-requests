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

    const promises = [];

    promises.push(triggerDispatch('siteminder-tests.yml', { environment: 'DEV', cluster: 'GOLD' }));

    promises.push(triggerDispatch('siteminder-tests.yml', { environment: 'TEST', cluster: 'GOLD' }));

    // the days of week are represented in the range 0-6
    if (new Date().getDay() === 0)
      promises.push(triggerDispatch('siteminder-tests.yml', { environment: 'PROD', cluster: 'GOLD' }));

    const data = await Promise.all(promises);

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
