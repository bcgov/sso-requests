import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { IntegrationProgressStatus } from 'components/SubmittedStatusIndicator';
import GithubStatus from './GithubStatus';
import { Integration } from 'interfaces/Request';
import { SubTitle, FlexStartBox, ApprovalContext } from './shared';

interface Props {
  integration: Integration;
  approvalContext: ApprovalContext;
}

function GithubStatusPanel({ integration, approvalContext }: Props) {
  const { hasProd, hasGithub, awaitingGithubProd, githubProdApplying, githubApproved } = approvalContext;
  if (!hasProd || !hasGithub) return null;

  let content = null;

  if (githubProdApplying) {
    content = (
      <FlexStartBox>
        <div>
          <FontAwesomeIcon icon={faCheckCircle} color="#2E8540" />
        </div>
        <div>
          <span>
            Your integration has been approved. Please wait approx. 10 min to get access to your installation
            information access again.
          </span>
          <SubTitle>Progress Update</SubTitle>
          <IntegrationProgressStatus integration={integration} />
        </div>
      </FlexStartBox>
    );
  } else if (githubApproved) {
    content = (
      <FlexStartBox>
        <div>
          <FontAwesomeIcon icon={faCheckCircle} color="#2E8540" />
        </div>
        <div>
          <span>Your integration is approved and available.</span>
        </div>
      </FlexStartBox>
    );
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
