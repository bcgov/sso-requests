import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';
import getConfig from 'next/config';

const { serverRuntimeConfig = {} } = getConfig() || {};
const { gh_app_id, gh_app_installation_id, gh_app_private_key } = serverRuntimeConfig;

let cachedOctokit: Octokit | null = null;

export const authenticateToGithub = async () => {
  if (!cachedOctokit) {
    cachedOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: gh_app_id,
        privateKey: Buffer.from(gh_app_private_key, 'base64').toString('utf-8'),
        installationId: gh_app_installation_id,
      },
    });

    await cachedOctokit.rest.apps.getAuthenticated();
  }

  return cachedOctokit;
};
