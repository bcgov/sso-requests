import { Integration } from 'interfaces/Request';
import TabContent from './TabContent';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function GithubTabContent({ integration, onApproved }: Props) {
  if (!integration) return null;
  const { status, githubApproved } = integration;

  const canApproveProd = (status === 'applied' && !githubApproved) || false;
  const awaitingProdComplete = (status !== 'applied' && githubApproved) || false;

  return (
    <TabContent
      type="github"
      integration={integration}
      canApproveProd={canApproveProd}
      awaitingProdComplete={awaitingProdComplete}
      onApproved={onApproved}
    />
  );
}

export default GithubTabContent;
