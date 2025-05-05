import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function SocialTabContent({ integration, onApproved }: Props) {
  if (!integration) return null;
  const { status, socialApproved } = integration;

  const canApproveProd = !socialApproved || false;

  return (
    <TabContent
      type="social"
      integration={integration}
      canApproveProd={canApproveProd}
      notApplied={status !== 'applied'}
      onApproved={onApproved}
    />
  );
}

export default SocialTabContent;
