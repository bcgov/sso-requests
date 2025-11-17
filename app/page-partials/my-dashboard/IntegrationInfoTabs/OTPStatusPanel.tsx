import React from 'react';
import OTPStatus from './OTPStatus';
import { SubTitle, ApprovalContext, ApprovedAndAvailable } from './shared';

interface Props {
  approvalContext: ApprovalContext;
}

function OTPStatusPanel({ approvalContext }: Readonly<Props>) {
  const { hasProd, hasOTP, awaitingOTPProd, otpApproved } = approvalContext;
  if (!hasProd || !hasOTP) return null;

  let content = null;

  if (otpApproved) {
    content = <ApprovedAndAvailable />;
  } else if (awaitingOTPProd) {
    content = <OTPStatus />;
  }

  return (
    <>
      <br />
      <SubTitle>Access to OTP Prod</SubTitle>
      <br />
      {content}
    </>
  );
}

export default OTPStatusPanel;
