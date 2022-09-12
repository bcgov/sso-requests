import React from 'react';
import GithubStatus from './GithubStatus';
import { Integration } from 'interfaces/Request';
import { SubTitle, ApprovalContext, ApprovedAndWait, ApprovedAndAvailable } from './shared';

interface Props {
  integration: Integration;
  approvalContext: ApprovalContext;
}

function GithubStatusPanel({ integration, approvalContext }: Props) {
  const { hasProd, hasGithub, awaitingGithubProd, githubProdApplying, githubApproved } = approvalContext;
  if (!hasProd || !hasGithub) return null;

  let content = null;

  if (githubProdApplying) {
    content = <ApprovedAndWait integration={integration} />;
  } else if (githubApproved) {
    content = <ApprovedAndAvailable />;
  } else if (awaitingGithubProd) {
    content = <GithubStatus integration={integration} />;
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
