import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import getConfig from 'next/config';

const { serverRuntimeConfig = {} } = getConfig() || {};
const { gh_access_token } = serverRuntimeConfig;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const result = await axios({
    url: 'https://api.github.com/graphql',
    method: 'post',
    data: JSON.stringify({
      query: `{
        repository(owner: "bcgov", name: "sso-keycloak") {
          id
          nameWithOwner
          discussions(first: 80) {
            # type: DiscussionConnection
            totalCount # Int!
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
    }`,
      variables: {},
    }),
    headers: {
      Authorization: `bearer ${gh_access_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (result) res.send(result.data);
  else res.status(500).json({ message: 'Internal server error' });
}
