import React from 'react';
import DigitalCredentialStatus from './DigitalCredentialStatus';
import { Integration } from 'interfaces/Request';
import { SubTitle, ApprovalContext, ApprovedAndWait, ApprovedAndAvailable } from './shared';

interface Props {
  integration: Integration;
  approvalContext: ApprovalContext;
}

function DigitalCredentialPanel({ integration, approvalContext }: Readonly<Props>) {
  const {
    hasProd,
    hasDigitalCredential,
    awaitingDigitalCredentialProd,
    digitalCredentialProdApplying,
    digitalCredentialApproved,
  } = approvalContext;
  if (!hasProd || !hasDigitalCredential) return null;

  let content = null;

  if (digitalCredentialProdApplying) {
    content = <ApprovedAndWait integration={integration} />;
  } else if (digitalCredentialApproved) {
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
