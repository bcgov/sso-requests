import React from 'react';
import VerifiableCredentialStatus from './VerifiableCredentialStatus';
import { Integration } from 'interfaces/Request';
import { SubTitle, ApprovalContext, ApprovedAndWait, ApprovedAndAvailable } from './shared';

interface Props {
  integration: Integration;
  approvalContext: ApprovalContext;
}

function VerifiableCredentialPanel({ integration, approvalContext }: Readonly<Props>) {
  const {
    hasProd,
    hasVerifiableCredential,
    awaitingVerifiableCredentialProd,
    verifiableCredentialProdApplying,
    verifiableCredentialApproved,
  } = approvalContext;
  if (!hasProd || !hasVerifiableCredential) return null;

  let content = null;

  if (verifiableCredentialProdApplying) {
    content = <ApprovedAndWait integration={integration} />;
  } else if (verifiableCredentialApproved) {
    content = <ApprovedAndAvailable />;
  } else if (awaitingVerifiableCredentialProd) {
    content = <VerifiableCredentialStatus integration={integration} />;
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

export default VerifiableCredentialPanel;
