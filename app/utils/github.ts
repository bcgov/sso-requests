import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';

let cachedOctokit: Octokit | null = null;

export const authenticateToGithub = async () => {
  if (!cachedOctokit) {
    cachedOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GH_APP_ID!,
        privateKey: Buffer.from(process.env.GH_APP_PRIVATE_KEY!, 'base64').toString('utf-8'),
        installationId: process.env.GH_APP_INSTALLATION_ID!,
      },
    });

    await cachedOctokit.rest.apps.getAuthenticated();
  }

  return cachedOctokit;
};
