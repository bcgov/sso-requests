import React from 'react';
import BceidStatus from './BceidStatus';
import { SubTitle, ApprovalContext, ApprovedAndAvailable } from './shared';

interface Props {
  approvalContext: ApprovalContext;
}

function BceidStatusPanel({ approvalContext }: Readonly<Props>) {
  const { hasDev, hasTest, hasProd, hasBceid, devBceidApproved, testBceidApproved, bceidApproved } = approvalContext;
  if (!hasBceid || (!hasDev && !hasTest && !hasProd)) return null;

  let content = null;
  const allRequestedEnvironmentsApproved =
    (!hasDev || devBceidApproved) && (!hasTest || testBceidApproved) && (!hasProd || bceidApproved);

  if (allRequestedEnvironmentsApproved) {
    content = <ApprovedAndAvailable />;
  } else {
    content = (
      <BceidStatus
        hasDev={hasDev}
        hasTest={hasTest}
        hasProd={hasProd}
        devBceidApproved={devBceidApproved}
        testBceidApproved={testBceidApproved}
        bceidApproved={bceidApproved}
      />
    );
  }

  return (
    <>
      <br />
      <SubTitle>Access to BCeID Environments</SubTitle>
      <br />
      {content}
    </>
  );
}

export default BceidStatusPanel;
