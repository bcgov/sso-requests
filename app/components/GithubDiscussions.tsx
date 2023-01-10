import React, { useEffect, useState } from 'react';
import Link from '@button-inc/bcgov-theme/Link';
import { Accordion } from '@bcgov-sso/common-react-components';
import axios from 'axios';
import Giscus from '@giscus/react';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { gh_secret_manage_discussions } = publicRuntimeConfig;

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
          }
          `,
      },
      headers: {
        Authorization: `bearer ${gh_secret_manage_discussions}`,
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
            <div style={{ maxHeight: '300px', overflowY: 'scroll' }}>
              <Giscus
                repo={repo.nameWithOwner}
                repoId={repo.id}
                category={a.category.name}
                categoryId={a.category.id}
                mapping="number"
                term={a.number}
                reactionsEnabled="0"
                emitMetadata="0"
                inputPosition="bottom"
                theme="light"
                lang="en"
              />
            </div>
          </Accordion.Panel>
        ))}
      </Accordion>
    </>
  );
}
