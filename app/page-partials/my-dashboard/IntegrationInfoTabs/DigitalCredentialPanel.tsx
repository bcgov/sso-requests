import React from 'react';
import DigitalCredentialStatus from './DigitalCredentialStatus';
import { SubTitle, ApprovalContext, ApprovedAndAvailable } from './shared';

interface Props {
  approvalContext: ApprovalContext;
}

function DigitalCredentialPanel({ approvalContext }: Readonly<Props>) {
  const { hasProd, hasDigitalCredential, awaitingDigitalCredentialProd, digitalCredentialApproved } = approvalContext;
  if (!hasProd || !hasDigitalCredential) return null;

  let content = null;

  if (digitalCredentialApproved) {
    content = <ApprovedAndAvailable />;
  } else if (awaitingDigitalCredentialProd) {
    content = <DigitalCredentialStatus />;
  }

  return (
    <>
      <br />
      <SubTitle>Access to Digital Credential Prod</SubTitle>
      <br />
      {content}
    </>
  );
}

export default DigitalCredentialPanel;
