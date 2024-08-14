import React from 'react';
import BceidStatus from './BceidStatus';
import { SubTitle, ApprovalContext, ApprovedAndAvailable } from './shared';

interface Props {
  approvalContext: ApprovalContext;
}

function BceidStatusPanel({ approvalContext }: Readonly<Props>) {
  const { hasProd, hasBceid, awaitingBceidProd, bceidApproved } = approvalContext;
  if (!hasProd || !hasBceid) return null;

  let content = null;

  if (bceidApproved) {
    content = <ApprovedAndAvailable />;
  } else if (awaitingBceidProd) {
    content = <BceidStatus />;
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
