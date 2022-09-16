import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function BceidTabContent({ integration, onApproved }: Props) {
  if (!integration) return null;
  const { status, bceidApproved } = integration;

  const canApproveProd = (status === 'applied' && !bceidApproved) || false;
  const awaitingTFComplete = status !== 'applied';

  return (
    <TabContent
      type="bceid"
      integration={integration}
      canApproveProd={canApproveProd}
      awaitingTFComplete={awaitingTFComplete}
      onApproved={onApproved}
    />
  );
}

export default BceidTabContent;
