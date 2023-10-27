import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function VerifiableCredentialTabContent({ integration, onApproved }: Readonly<Props>) {
  if (!integration) return null;
  const { status, verifiableCredentialApproved } = integration;

  const canApproveProd = !verifiableCredentialApproved || false;
  const awaitingTFComplete = status !== 'applied';

  return (
    <TabContent
      type="verifiableCredential"
      integration={integration}
      canApproveProd={canApproveProd}
      awaitingTFComplete={awaitingTFComplete}
      onApproved={onApproved}
    />
  );
}

export default VerifiableCredentialTabContent;
