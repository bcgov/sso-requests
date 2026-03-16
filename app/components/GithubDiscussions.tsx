import React, { useEffect, useState } from 'react';
import { Accordion } from '@bcgov-sso/common-react-components';
import Giscus from '@giscus/react';
import { fetchDiscussions } from '@app/services/github';
import { withTopAlert } from '@app/layout/TopAlert';
import { FailureMessage } from '@app/page-partials/my-dashboard/Messages';

interface Props {
  children?: React.ReactNode;
}

// const CommentsContainer = styled.div`
//   max-height: 300px;
//   overflow-y: scroll;
// `;

function GithubDiscussions({ children }: Readonly<Props>) {
  const requiredCategory = 'Getting Started with our Common Hosted Single Sign on(CSS)';
  const [repo, setRepo] = useState<any>({});
  const [nodes, setNodes] = useState([]);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    fetchGithubDiscussions();
  }, []);

  const fetchGithubDiscussions = async () => {
    setDownloadError(false);
    const [result, err]: any = await fetchDiscussions();
    if (err) {
      setDownloadError(true);
      return;
    }

    setRepo(result?.data?.repository);
    setNodes(
      result?.data?.repository?.discussions?.nodes.filter((node: any) => node.category.name.includes(requiredCategory)),
    );
  };

  return (
    <>
      <h2>Frequently Asked Questions</h2>
      {downloadError ? (
        <FailureMessage message="Failed to download discussions. Please try again later." />
      ) : (
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
      )}
    </>
  );
}

export default withTopAlert(GithubDiscussions);
