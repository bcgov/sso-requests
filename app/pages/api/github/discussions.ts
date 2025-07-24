import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticateToGithub } from '@app/utils/github';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const octokit = await authenticateToGithub();
      const query = `
      {
        repository(owner: "bcgov", name: "sso-keycloak") {
          id
          nameWithOwner
          discussions(first: 80) {
            totalCount
            nodes {
              id
              title
              number
              category {
                id
                name
              }
            }
          }
        }
      }
      `;

      const result = await octokit.graphql(query);
      if (result) return res.send({ data: result });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    handleError(res, err);
  }
}
