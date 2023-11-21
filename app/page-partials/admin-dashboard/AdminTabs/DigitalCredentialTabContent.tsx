import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function DigitalCredentialTabContent({ integration, onApproved }: Readonly<Props>) {
  if (!integration) return null;
  const { status, digitalCredentialApproved } = integration;

  const canApproveProd = !digitalCredentialApproved || false;
  const awaitingTFComplete = status !== 'applied';

  return (
    <TabContent
      type="digitalCredential"
      integration={integration}
      canApproveProd={canApproveProd}
      awaitingTFComplete={awaitingTFComplete}
      onApproved={onApproved}
    />
  );
}

export default DigitalCredentialTabContent;
