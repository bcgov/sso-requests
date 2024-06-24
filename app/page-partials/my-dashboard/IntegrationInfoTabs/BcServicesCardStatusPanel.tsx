import React from 'react';
import BcServicesCardStatus from './BcServicesCardStatus';
import { Integration } from 'interfaces/Request';
import { SubTitle, ApprovalContext, ApprovedAndWait, ApprovedAndAvailable } from './shared';

interface Props {
  integration: Integration;
  approvalContext: ApprovalContext;
}

function BcServicesCardStatusPanel({ integration, approvalContext }: Props) {
  const { hasProd, hasBcServicesCard, awaitingBcServicesCardProd, bcServicesCardProdApplying, bcServicesCardApproved } =
    approvalContext;
  if (!hasProd || !hasBcServicesCard) return null;

  let content = null;

  if (bcServicesCardProdApplying) {
    content = <ApprovedAndWait integration={integration} />;
  } else if (bcServicesCardApproved) {
    content = <ApprovedAndAvailable />;
  } else if (awaitingBcServicesCardProd) {
    content = <BcServicesCardStatus integration={integration} />;
  }

  return (
    <>
      <br />
      <SubTitle>Access to BC Services Card Prod</SubTitle>
      <br />
      {content}
    </>
  );
}

export default BcServicesCardStatusPanel;
