import axios from 'axios';

export const fetchDiscussions = async () => {
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
      Authorization: `bearer ${process.env.GH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  return result.data;
};
