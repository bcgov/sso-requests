import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function GithubTabContent({ integration, onApproved }: Props) {
  if (!integration) return null;
  const { status, githubApproved } = integration;

  const canApproveProd = !githubApproved || false;

  return (
    <TabContent
      type="github"
      integration={integration}
      canApproveProd={canApproveProd}
      notApplied={status !== 'applied'}
      onApproved={onApproved}
    />
  );
}

export default GithubTabContent;
