import React from 'react';
import GithubStatus from './GithubStatus';
import { SubTitle, ApprovalContext, ApprovedAndAvailable } from './shared';

interface Props {
  approvalContext: ApprovalContext;
}

function GithubStatusPanel({ approvalContext }: Readonly<Props>) {
  const { hasProd, hasGithub, awaitingGithubProd, githubApproved } = approvalContext;
  if (!hasProd || !hasGithub) return null;

  let content = null;

  if (githubApproved) {
    content = <ApprovedAndAvailable />;
  } else if (awaitingGithubProd) {
    content = <GithubStatus />;
  }

  return (
    <>
      <br />
      <SubTitle>Access to GitHub Prod</SubTitle>
      <br />
      {content}
    </>
  );
}

export default GithubStatusPanel;
