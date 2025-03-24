import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function BceidTabContent({ integration, onApproved }: Props) {
  if (!integration) return null;
  const { status, bceidApproved } = integration;

  const canApproveProd = !bceidApproved || false;

  return (
    <TabContent
      type="bceid"
      integration={integration}
      canApproveProd={canApproveProd}
      notApplied={status !== 'applied'}
      onApproved={onApproved}
    />
  );
}

export default BceidTabContent;
