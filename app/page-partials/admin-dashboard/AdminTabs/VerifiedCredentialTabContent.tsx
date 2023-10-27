import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function VerifiedCredentialTabContent({ integration, onApproved }: Props) {
  if (!integration) return null;
  const { status, verifiedCredentialApproved } = integration;

  const canApproveProd = !verifiedCredentialApproved || false;
  const awaitingTFComplete = status !== 'applied';

  return (
    <TabContent
      type="verifiedCredential"
      integration={integration}
      canApproveProd={canApproveProd}
      awaitingTFComplete={awaitingTFComplete}
      onApproved={onApproved}
    />
  );
}

export default VerifiedCredentialTabContent;
