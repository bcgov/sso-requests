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

  return (
    <TabContent
      type="BCServicesCard"
      integration={integration}
      canApproveProd={canApproveProd}
      notApplied={status !== 'applied'}
      onApproved={onApproved}
    />
  );
}

export default BcServicesCardTabContent;
