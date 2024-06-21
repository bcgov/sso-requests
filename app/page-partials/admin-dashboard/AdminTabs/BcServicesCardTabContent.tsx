import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function BcServicesCardTabContent({ integration, onApproved }: Readonly<Props>) {
  if (!integration) return null;
  const { status, bcServicesCardApproved } = integration;

  const canApproveProd = !bcServicesCardApproved || false;
  const awaitingTFComplete = status !== 'applied';

  return (
    <TabContent
      type="bcServicesCard"
      integration={integration}
      canApproveProd={canApproveProd}
      awaitingTFComplete={awaitingTFComplete}
      onApproved={onApproved}
    />
  );
}

export default BcServicesCardTabContent;
