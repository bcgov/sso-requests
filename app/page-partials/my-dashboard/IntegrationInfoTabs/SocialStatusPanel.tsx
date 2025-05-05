import React from 'react';
import SocialStatus from './SocialStatus';
import { SubTitle, ApprovalContext, ApprovedAndAvailable } from './shared';

interface Props {
  approvalContext: ApprovalContext;
}

function SocialStatusPanel({ approvalContext }: Readonly<Props>) {
  const { hasProd, hasSocial, socialApproved } = approvalContext;
  if (!hasProd || !hasSocial) return null;

  let content = null;

  if (socialApproved) {
    content = <ApprovedAndAvailable />;
  } else if (!socialApproved) {
    content = <SocialStatus />;
  }

  return (
    <>
      <br />
      <SubTitle>Access to Social Prod</SubTitle>
      <br />
      {content}
    </>
  );
}

export default SocialStatusPanel;
