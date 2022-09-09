import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { IntegrationProgressStatus } from 'components/SubmittedStatusIndicator';
import BceidStatus from './BceidStatus';
import { Integration } from 'interfaces/Request';
import { SubTitle, FlexStartBox, ApprovalContext } from './shared';

interface Props {
  integration: Integration;
  approvalContext: ApprovalContext;
}

function BceidStatusPanel({ integration, approvalContext }: Props) {
  const { hasProd, hasBceid, awaitingBceidProd, bceidProdApplying, bceidApproved } = approvalContext;
  if (!hasProd || !hasBceid) return null;

  let content = null;

  if (bceidProdApplying) {
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
  } else if (bceidApproved) {
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
  } else if (awaitingBceidProd) {
    content = <BceidStatus integration={integration} />;
  }

  return (
    <>
      <br />
      <SubTitle>Access to BCeID Prod</SubTitle>
      <br />
      {content}
    </>
  );
}

export default BceidStatusPanel;
