import styled from 'styled-components';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import startCase from 'lodash.startcase';
import CenteredModal from 'components/CenteredModal';
import { updateRequest } from 'services/request';
import { Integration } from 'interfaces/Request';
import {
  checkIfBceidProdApplying,
  checkIfGithubProdApplying,
  checkIfBcServicesCardProdApplying,
} from '@app/utils/helpers';
import { ErrorMessage } from '@app/components/MessageBox';
import { Link } from '@button-inc/bcgov-theme';
import { useEffect, useState } from 'react';
import { getEvents } from '@app/services/event';
import { Event } from 'interfaces/Event';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

interface Props {
  integration: Integration;
  type: 'bceid' | 'github' | 'BCServicesCard';
  canApproveProd: boolean;
  awaitingTFComplete: boolean;
  onApproved?: () => void;
}

const approvalTypeMap = {
  bceid: 'bceidApproved',
  github: 'githubApproved',
  BCServicesCard: 'bcServicesCardApproved',
};

function TabContent({ integration, type, canApproveProd, awaitingTFComplete, onApproved }: Props) {
  const [openApprovalModal, setOpenApprovalModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  const getApprovalEvents = async () => {
    if (!integration) return;

    const [data] = await getEvents({
      requestId: Number(integration.id),
      eventCode: 'all',
    });

    if (data && data?.rows?.length > 0) {
      const idpApprovalEvents: Event[] = [];
      data.rows.forEach((event) => {
        if (event?.details?.changes?.find((c: any) => c?.path.includes(approvalTypeMap[type]))) {
          idpApprovalEvents.push(event);
        }
      });

      if (idpApprovalEvents.length > 0) {
        setEvents(idpApprovalEvents);
      }
    }
  };

  useEffect(() => {
    getApprovalEvents();
  }, [integration?.id, integration?.bceidApproved, integration?.githubApproved, integration?.bcServicesCardApproved]);

  if (!integration) return null;

  const displayType = startCase(type);
  const openModal = () => {
    setOpenApprovalModal(true);
  };
  const approvalPropertyName = approvalTypeMap[type];

  let typeApproved = false;
  switch (type) {
    case 'bceid':
      typeApproved = checkIfBceidProdApplying(integration);
      break;
    case 'github':
      typeApproved = checkIfGithubProdApplying(integration);
      break;
    case 'BCServicesCard':
      typeApproved = checkIfBcServicesCardProdApplying(integration);
      break;
  }

  let content;

  if (integration?.archived) {
    content = (
      <>
        <p>Cannot approve deleted/archived integrations.</p>
      </>
    );
  } else if (canApproveProd) {
    content = (
      <>
        <p>{`To begin the ${displayType} integration in production, Click Below.`}</p>
        <button className="primary" onClick={openModal} disabled={awaitingTFComplete}>
          Approve Prod
        </button>
      </>
    );
  } else if (awaitingTFComplete && typeApproved) {
    content = (
      <div style={{ display: 'inline-flex', background: '#FFCCCB', borderRadius: '5px' }}>
        <div style={{ padding: 5 }}>
          <ErrorMessage>
            Your request for {type} approval could not be completed. Please{' '}
            <Link external href="mailto:bcgov.sso@gov.bc.ca">
              contact the Pathfinder SSO Team
            </Link>
          </ErrorMessage>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        {events.length > 0 ? (
          events.map((event) => (
            <p key={event.id} style={{ marginBottom: '5px' }} data-testid="idp-approved-note">
              Approved by <b>{event?.idirUserDisplayName}</b> on{' '}
              <b>{new Date(event?.createdAt as string).toLocaleString()}</b>
            </p>
          ))
        ) : (
          <p>This integration has already been approved.</p>
        )}
      </>
    );
  }

  const onConfirm = async () => {
    const [, err] = await updateRequest(
      {
        ...integration,
        [approvalPropertyName]: true,
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
        id={`${type}-approval-modal`}
        openModal={openApprovalModal}
        handleClose={() => setOpenApprovalModal(false)}
        content={`Are you sure you want to approve this integration for ${displayType} production?`}
        onConfirm={onConfirm}
        icon={faExclamationTriangle}
        title={`${displayType} Approve`}
      />
    </>
  );
}

export default TabContent;
