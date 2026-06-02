import { Integration } from 'interfaces/Request';
import styled from 'styled-components';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';
import CenteredModal from 'components/CenteredModal';
import { updateRequest } from 'services/request';
import { getEvents } from '@app/services/event';
import { Event } from 'interfaces/Event';

interface Props {
  integration?: Integration;
  onApproved?: () => void;
}

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

const ApprovalSection = styled.div`
  margin-bottom: 2rem;
`;

type EnvironmentType = 'dev' | 'test' | 'prod';

type ApprovalFlagMap = {
  [key in EnvironmentType]: keyof Integration;
};

const approvalFlagMap: ApprovalFlagMap = {
  dev: 'devBceidApproved',
  test: 'testBceidApproved',
  prod: 'bceidApproved',
};

function BceidTabContent({ integration, onApproved }: Props) {
  const [openApprovalModal, setOpenApprovalModal] = useState<EnvironmentType | null>(null);
  const [events, setEvents] = useState<{ [key in EnvironmentType]: Event[] }>({
    dev: [],
    test: [],
    prod: [],
  });

  const getApprovalEvents = async () => {
    if (!integration) return;

    const [data] = await getEvents({
      requestId: Number(integration.id),
      eventCode: 'all',
    });

    if (data?.rows && Array.isArray(data.rows)) {
      const devEvents: Event[] = [];
      const testEvents: Event[] = [];
      const prodEvents: Event[] = [];

      data.rows.forEach((event) => {
        if (event?.details?.changes?.find((c: any) => c?.path.includes('devBceidApproved') && c.rhs === true)) {
          devEvents.push(event);
        }
        if (event?.details?.changes?.find((c: any) => c?.path.includes('testBceidApproved') && c.rhs === true)) {
          testEvents.push(event);
        }
        if (event?.details?.changes?.find((c: any) => c?.path.includes('bceidApproved') && c.rhs === true)) {
          prodEvents.push(event);
        }
      });

      setEvents({ dev: devEvents, test: testEvents, prod: prodEvents });
    }
  };

  useEffect(() => {
    getApprovalEvents();
  }, [integration?.id, integration?.bceidApproved, integration?.devBceidApproved, integration?.testBceidApproved]);

  if (!integration) return null;

  const { status, environments = [] } = integration;
  const notApplied = status !== 'applied';

  const handleApprovalClick = (env: EnvironmentType) => {
    setOpenApprovalModal(env);
  };

  const handleConfirmApproval = async () => {
    if (!openApprovalModal) return;

    const flagKey = approvalFlagMap[openApprovalModal];
    const [, err] = await updateRequest(
      {
        ...integration,
        [flagKey]: true,
      },
      true,
    );

    if (onApproved && !err) {
      onApproved();
    }

    setOpenApprovalModal(null);
  };

  const renderEnvironmentApproval = (env: EnvironmentType) => {
    const flagKey = approvalFlagMap[env];
    const isApproved = integration[flagKey];
    const hasEnvironment = environments.includes(env);

    if (!hasEnvironment) return null;

    return (
      <ApprovalSection key={env}>
        <h4>
          {env.charAt(0).toUpperCase() + env.slice(1)} Environment
          {isApproved && <span> Approved</span>}
        </h4>
        {isApproved ? (
          <div>
            {events[env].length > 0 ? (
              events[env].map((event) => (
                <p key={event.id} style={{ marginBottom: '5px' }} data-testid={`bceid-${env}-approved-note`}>
                  Approved by <b>{event?.idirUserDisplayName}</b> on{' '}
                  <b>{new Date(event?.createdAt as string).toLocaleString()}</b>
                </p>
              ))
            ) : (
              <p>This integration has been approved for {env}.</p>
            )}
          </div>
        ) : (
          <button
            className="primary"
            onClick={() => handleApprovalClick(env)}
            disabled={notApplied}
            data-testid={`approve-${env}-button`}
          >
            Approve {env.charAt(0).toUpperCase() + env.slice(1)}
          </button>
        )}
      </ApprovalSection>
    );
  };

  if (integration?.archived) {
    return (
      <TabWrapper>
        <br />
        <p>Cannot approve deleted/archived integrations.</p>
      </TabWrapper>
    );
  }

  return (
    <>
      <TabWrapper>
        <br />
        {renderEnvironmentApproval('dev')}
        {renderEnvironmentApproval('test')}
        {renderEnvironmentApproval('prod')}
      </TabWrapper>
      <CenteredModal
        id="bceid-approval-modal"
        openModal={openApprovalModal !== null}
        handleClose={() => setOpenApprovalModal(null)}
        content={`Are you sure you want to approve this integration for BCeID ${openApprovalModal} environment?`}
        onConfirm={handleConfirmApproval}
        icon={faExclamationTriangle}
        title="Bceid Approve"
      />
    </>
  );
}

export default BceidTabContent;
