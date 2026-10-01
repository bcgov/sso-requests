import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function BcgovIdirTabContent({ integration, onApproved }: Readonly<Props>) {
  if (!integration) return null;
  const { status, bcgovidirApproved } = integration;

  return (
    <TabContent
      type="BCGOV IDIR"
      integration={integration}
      canApproveProd={!bcgovidirApproved}
      notApplied={status !== 'applied'}
      onApproved={onApproved}
    />
  );
}

export default BcgovIdirTabContent;
