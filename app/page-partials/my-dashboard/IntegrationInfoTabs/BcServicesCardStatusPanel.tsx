import React from 'react';
import BcServicesCardStatus from './BcServicesCardStatus';
import { SubTitle, ApprovalContext, ApprovedAndAvailable } from './shared';

interface Props {
  approvalContext: ApprovalContext;
}

function BcServicesCardStatusPanel({ approvalContext }: Readonly<Props>) {
  const { hasProd, hasBcServicesCard, awaitingBcServicesCardProd, bcServicesCardApproved } = approvalContext;
  if (!hasProd || !hasBcServicesCard) return null;

  let content = null;

  if (bcServicesCardApproved) {
    content = <ApprovedAndAvailable />;
  } else if (awaitingBcServicesCardProd) {
    content = <BcServicesCardStatus />;
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
