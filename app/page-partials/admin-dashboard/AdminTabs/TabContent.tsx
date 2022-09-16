import styled from 'styled-components';
import Button from '@button-inc/bcgov-theme/Button';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import startCase from 'lodash.startcase';
import CenteredModal from 'components/CenteredModal';
import { updateRequest } from 'services/request';
import { Integration } from 'interfaces/Request';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

interface Props {
  integration: Integration;
  type: 'bceid' | 'github';
  canApproveProd: boolean;
  awaitingTFComplete: boolean;
  onApproved?: () => void;
}

function TabContent({ integration, type, canApproveProd, awaitingTFComplete, onApproved }: Props) {
  if (!integration) return null;

  const displayType = startCase(type);
  const modalId = `${type}-approval-modal`;
  const openModal = () => (window.location.hash = modalId);

  let content;
  if (canApproveProd) {
    content = (
      <>
        <p>{`To begin the ${displayType} integration in production, Click Below.`}</p>
        <Button onClick={openModal}>Approve Prod</Button>
      </>
    );
  } else if (awaitingTFComplete) {
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
        ...integration,
        [`${type}Approved`]: true,
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
        content={`Are you sure you want to approve this integration for ${displayType} production?`}
        onConfirm={onConfirm}
        icon={faExclamationTriangle}
        title={`${displayType} Approve`}
      />
    </>
  );
}

export default TabContent;
