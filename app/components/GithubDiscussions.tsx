import React, { useEffect, useState } from 'react';
import Link from '@button-inc/bcgov-theme/Link';
import { Accordion } from '@bcgov-sso/common-react-components';
import Giscus from '@giscus/react';
import { fetchDiscussions } from '@app/services/github';

interface Props {
  children?: React.ReactNode;
}

export default function GithubDiscussions({ children }: Props) {
  const [repo, setRepo] = useState<any>({});
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    fetchGithubDiscussions();
  }, []);

  const fetchGithubDiscussions = async () => {
    const [result, err]: any = await fetchDiscussions();
    console.log(result);

    setRepo(result?.data?.repository);
    setNodes(result?.data?.repository?.discussions?.nodes);
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
