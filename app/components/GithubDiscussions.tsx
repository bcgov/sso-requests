import React, { useEffect, useState } from 'react';
import Link from '@button-inc/bcgov-theme/Link';
import { Accordion } from '@bcgov-sso/common-react-components';
import axios from 'axios';
import Giscus from '@giscus/react';

interface Props {
  children?: React.ReactNode;
}

export default function GithubDiscussions({ children }: Props) {
  const [repo, setRepo] = useState<any>({});
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const fetchDiscussions = () => {
    axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      data: {
        query: `{
            repository(owner: "NithinKuruba", name: "test-gh-actions") {
              id
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
          }
          `,
      },
      headers: {
        Authorization: `bearer ${process.env.GITHUB_PAT}`,
      },
    }).then((result) => {
      setRepo(result?.data?.data?.repository);
      setNodes(result?.data?.data?.repository?.discussions?.nodes);
    });
  };

  return (
    <>
      <h2>Frequently Asked Questions</h2>
      <Accordion>
        {nodes.map((a: any) => (
          <Accordion.Panel key={a.number} title={a.title}>
            <Giscus
              repo="nithinkuruba/test-gh-actions"
              repoId={repo.id}
              category={a.category.name}
              categoryId={a.category.id}
              mapping="number"
              term={a.number}
              reactionsEnabled="1"
              emitMetadata="0"
              inputPosition="top"
              theme="light"
              lang="en"
            />
          </Accordion.Panel>
        ))}
      </Accordion>
    </>
  );
}
