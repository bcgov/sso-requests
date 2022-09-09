import styled from 'styled-components';
import Button from '@button-inc/bcgov-theme/Button';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';
import { updateRequest } from 'services/request';
import { Integration } from 'interfaces/Request';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

const modalId = 'github-approval-modal';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

function GithubTabContent({ integration, onApproved }: Props) {
  if (!integration) return null;
  const { status, githubApproved } = integration;

  const canApproveProd = status === 'applied' && !githubApproved;
  const awaitingProdComplete = status !== 'applied' && githubApproved;

  const openModal = () => (window.location.hash = modalId);

  let content;
  if (canApproveProd) {
    content = (
      <>
        <p>To begin the GitHub integration in production, Click Below.</p>
        <Button onClick={openModal}>Approve Prod</Button>
      </>
    );
  } else if (awaitingProdComplete) {
    content = (
      <SubmittedStatusIndicator
        integration={integration}
        title="The terraform script will take approximately 20 minutes to complete."
      />
    );
  } else {
    content = <p>This integration has already been approved.</p>;
  }

  const onConfirm = async () => {
    const [, err] = await updateRequest(
      {
        id: integration.id,
        githubApproved: true,
      },
      true,
    );

    if (onApproved && !err) {
      onApproved();
    }
  };

  return (
    <>
      <TabWrapper>
        <br />
        {content}
      </TabWrapper>
      <CenteredModal
        id={modalId}
        content="Are you sure you want to approve this integration for GitHub production?"
        onConfirm={onConfirm}
        icon={faExclamationTriangle}
        title="GitHub Approve"
      />
    </>
  );
}

export default GithubTabContent;
