// migrate GitHub lambda here and call GitHub API directly to avoid multiple invocations.
// see https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
import { Octokit } from 'octokit';
import pick from 'lodash.pick';
import { IntegrationData } from '@lambda-shared/interfaces';
import { models } from '@lambda-shared/sequelize/models/models';
import {
  oidcDurationAdditionalFields,
  samlDurationAdditionalFields,
  samlFineGrainEndpointConfig,
  samlSignedAssertions,
} from '@app/schemas';
import {
  usesBceid,
  usesGithub,
  checkNotBceidGroup,
  checkNotGithubGroup,
  checkVerifiableCredential,
  usesVerifiableCredential,
} from '@app/helpers/integration';
import { getAccountableEntity } from '@lambda-shared/templates/helpers';
import { handlePRstage, updatePlannedItems } from '@lambda-actions/controllers/batch';

const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

const envFields = [
  'DisplayHeaderTitle',
  'LoginTitle',
  'ValidRedirectUris',
  'Idps',
  ...oidcDurationAdditionalFields,
  ...samlDurationAdditionalFields,
  ...samlFineGrainEndpointConfig,
  ...samlSignedAssertions,
];

const envFieldsAll = [];
['dev', 'test', 'prod'].forEach((env) => {
  envFields.forEach((prop) => envFieldsAll.push(`${env}${prop}`));
});

const allowedFieldsForGithub = [
  'id',
  'projectName',
  'clientId',
  'clientName',
  'realm',
  'publicAccess',
  'environments',
  'bceidApproved',
  'archived',
  'browserFlowOverride',
  'serviceType',
  'authType',
  'protocol',
  'additionalRoleAttribute',
  'userId',
  'teamId',
  'apiServiceAccount',
  'requester',
  ...envFieldsAll,
];

export const buildGitHubRequestData = (baseData: IntegrationData) => {
  const hasBceid = usesBceid(baseData);
  const hasGithub = usesGithub(baseData);
  const hasVerifiableCredential = usesVerifiableCredential(baseData);

  // let's use dev's idps until having a env-specific idp selections
  if (baseData.environments.includes('test')) baseData.testIdps = baseData.devIdps;
  if (baseData.environments.includes('prod')) baseData.prodIdps = baseData.devIdps;

  // prevent the TF from creating BCeID integration in prod environment if not approved
  if (!baseData.bceidApproved && hasBceid) {
    baseData.prodIdps = baseData.prodIdps.filter(checkNotBceidGroup);
  }

  // prevent the TF from creating VC integration in prod environment if not approved
  if (!baseData.verifiableCredentialApproved && hasVerifiableCredential) {
    baseData.prodIdps = baseData.prodIdps.filter((idp) => !checkVerifiableCredential(idp));
  }

  // prevent the TF from creating GitHub integration in prod environment if not approved
  if (!baseData.githubApproved && hasGithub) {
    baseData.prodIdps = baseData.prodIdps.filter(checkNotGithubGroup);
  }

  return baseData;
};

export const dispatchRequestWorkflow = async (integration: any) => {
  if (integration instanceof models.request) {
    integration = integration.get({ plain: true, clone: true });
  }

  integration = buildGitHubRequestData(integration);

  const idps = integration.devIdps;

  const payload = pick(integration, allowedFieldsForGithub);
  payload.accountableEntity = (await getAccountableEntity(integration)) || '';
  payload.idpNames = idps || [];
  if (payload.serviceType === 'gold') payload.browserFlowOverride = 'idp stopper';

  if (['development', 'production'].includes(process.env.NODE_ENV)) {
    // see https://docs.github.com/en/rest/reference/actions#create-a-workflow-dispatch-event
    // sample successful response
    // {
    //   "status": 204,
    //   "url": "https://api.github.com/repos/bcgov/sso-terraform-dev/actions/workflows/request.yml/dispatches",
    //   "headers": {
    //       "access-control-allow-origin": "*",
    //       "access-control-expose-headers": "ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, Deprecation, Sunset",
    //       "connection": "close",
    //       "content-security-policy": "default-src 'none'",
    //       "date": "Tue, 10 Aug 2021 17:07:37 GMT",
    //       "referrer-policy": "origin-when-cross-origin, strict-origin-when-cross-origin",
    //       "server": "GitHub.com",
    //       "strict-transport-security": "max-age=31536000; includeSubdomains; preload",
    //       "vary": "Accept-Encoding, Accept, X-Requested-With",
    //       "x-accepted-oauth-scopes": "",
    //       "x-content-type-options": "nosniff",
    //       "x-frame-options": "deny",
    //       "x-github-media-type": "github.v3; format=json",
    //       "x-github-request-id": "1234:58DE:1673AFF:40BA874:6112B259",
    //       "x-oauth-scopes": "repo, workflow, write:packages",
    //       "x-ratelimit-limit": "5000",
    //       "x-ratelimit-remaining": "4999",
    //       "x-ratelimit-reset": "1628618857",
    //       "x-ratelimit-resource": "core",
    //       "x-ratelimit-used": "1",
    //       "x-xss-protection": "0"
    //   }
    // }
    return octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
      owner: process.env.GH_OWNER,
      repo: process.env.GH_REPO,
      workflow_id: process.env.GH_WORKFLOW_ID,
      ref: process.env.GH_BRANCH,
      inputs: { integration: JSON.stringify(payload) },
    });
  } else {
    if (!integration.archived) {
      // skip call to github actions for local development
      setTimeout(() => {
        skipGithubActionStep(integration.id);
      }, 3000);
    }
    return { status: 204 };
  }
};

export const closeOpenPullRequests = async (id: number) => {
  if (['development', 'production'].includes(process.env.NODE_ENV)) {
    const labels = ['auto_generated', 'request', String(id)];

    // delete all open issues with the target client
    const issuesRes = await octokit.rest.issues.listForRepo({
      owner: process.env.GH_OWNER,
      repo: process.env.GH_REPO,
      state: 'open',
      labels: labels.join(','),
    });

    return Promise.all(
      issuesRes.data.map((issue) => {
        return octokit.rest.issues.update({
          owner: process.env.GH_OWNER,
          repo: process.env.GH_REPO,
          issue_number: issue.number,
          state: 'closed',
        });
      }),
    );
  }
};

export const skipGithubActionStep = async (integrationId) => {
  try {
    const integration = await models.request.findOne({ where: { id: integrationId } });

    setTimeout(async () => {
      await handlePRstage({
        id: integration.id,
        success: true,
        changes: {},
        isEmpty: false,
        isAllowedToMerge: false,
      });
    }, 5000);

    setTimeout(async () => {
      await updatePlannedItems({
        ids: [integration.id],
        success: true,
      });
    }, 10000);
  } catch (err) {
    console.log(err);
  }
};
