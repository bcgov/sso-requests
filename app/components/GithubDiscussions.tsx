import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Link from '@button-inc/bcgov-theme/Link';
import { Accordion } from '@bcgov-sso/common-react-components';
import Giscus from '@giscus/react';
import { fetchDiscussions } from '@app/services/github';

interface Props {
  children?: React.ReactNode;
}

// const CommentsContainer = styled.div`
//   max-height: 300px;
//   overflow-y: scroll;
// `;

export default function GithubDiscussions({ children }: Props) {
  const requiredCategory = 'Getting Started with our Common Hosted Single Sign on(CSS)';
  const [repo, setRepo] = useState<any>({});
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    fetchGithubDiscussions();
  }, []);

  const fetchGithubDiscussions = async () => {
    const [result, err]: any = await fetchDiscussions();
    setRepo(result?.data?.repository);
    setNodes(
      result?.data?.repository?.discussions?.nodes.filter((node: any) => node.category.name.includes(requiredCategory)),
    );
  };

  return (
    <>
      <h2>Frequently Asked Questions</h2>
      <Accordion>
        {nodes?.map((a: any, index) => (
          <Accordion.Panel key={a.id} title={a.title}>
            <div className="comments-container">
              <Giscus
                id={index.toString()}
                key={index}
                repo={repo.nameWithOwner}
                repoId={repo.id}
                category={a.category.name}
                categoryId={a.category.id}
                mapping="specific"
                term={a.title}
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
