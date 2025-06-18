import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function OTPTabContent({ integration, onApproved }: Props) {
  if (!integration) return null;
  const { status, otpApproved } = integration;

  const canApproveProd = !otpApproved || false;

  return (
    <TabContent
      type="otp"
      integration={integration}
      canApproveProd={canApproveProd}
      notApplied={status !== 'applied'}
      onApproved={onApproved}
    />
  );
}

export default OTPTabContent;
