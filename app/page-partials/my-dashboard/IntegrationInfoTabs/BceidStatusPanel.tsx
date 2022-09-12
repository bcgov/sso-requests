import React from 'react';
import BceidStatus from './BceidStatus';
import { Integration } from 'interfaces/Request';
import { SubTitle, ApprovalContext, ApprovedAndWait, ApprovedAndAvailable } from './shared';

interface Props {
  integration: Integration;
  approvalContext: ApprovalContext;
}

function BceidStatusPanel({ integration, approvalContext }: Props) {
  const { hasProd, hasBceid, awaitingBceidProd, bceidProdApplying, bceidApproved } = approvalContext;
  if (!hasProd || !hasBceid) return null;

  let content = null;

  if (bceidProdApplying) {
    content = <ApprovedAndWait integration={integration} />;
  } else if (bceidApproved) {
    content = <ApprovedAndAvailable />;
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
