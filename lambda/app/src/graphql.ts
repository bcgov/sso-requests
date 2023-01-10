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
          discussions(first: 10) {
            # type: DiscussionConnection
            totalCount # Int!
            nodes {
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
      Authorization: `bearer ${process.env.GH_SECRET}`,
      'Content-Type': 'application/json',
    },
  });
  return result.data;
};
