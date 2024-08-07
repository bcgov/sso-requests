import React, { useEffect, useState } from 'react';
import IntegrationInfoTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import VerticalLayout from 'page-partials/my-dashboard/VerticalLayout';
import { Integration } from 'interfaces/Request';
import { PageProps } from 'interfaces/props';
import CenteredModal from '@app/components/CenteredModal';
import { useRouter } from 'next/router';
import { faCommentDots, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Column = styled.div`
  display: flex;
  flex-direction: column;
  flex-basis: 100%;
  flex: 1;
`;

function MyIntegrations({ session }: PageProps) {
  const router = useRouter();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [integrationCount, setIntegrationCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const integrationFailedMessageModalId = 'integration-failed-modal';
  const handleModalFailedMessageModal = async () => (window.location.hash = integrationFailedMessageModalId);
  const [processedRequestId, setProcessedRequestId] = useState('');

  useEffect(() => {
    setProcessedRequestId(router.query.requestId as string);
    if (router?.query?.integrationFailedMessageModal === 'true') {
      setShowModal(true);
      handleModalFailedMessageModal();
    }
  }, [router.query.showModal]);

  return (
    <>
      <VerticalLayout
        tab="integrations"
        leftPanel={() => <IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />}
        rightPanel={() => integration && <IntegrationInfoTabs integration={integration} />}
        showResizable={integrationCount > 0}
      />
      <CenteredModal
        openModal={showModal}
        handleClose={() => setShowModal(false)}
        title={`${processedRequestId} - Integration request failed`}
        content={
          <div>
            <div>
              <p>The integration request could not be completed. Please contact the Pathfinder SSO Team.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
              <Column>
                <div>
                  <a
                    href="https://chat.developer.gov.bc.ca/channel/sso"
                    target="_blank"
                    title="Rocket Chat"
                    style={{ color: '#0d6efd' }}
                  >
                    <FontAwesomeIcon size="1x" icon={faCommentDots} color="#0d6efd" /> Rocketchat
                  </a>
                </div>
              </Column>
              <Column>
                <div>
                  <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" style={{ color: '#0d6efd' }}>
                    <FontAwesomeIcon size="1x" icon={faEnvelope} color="#0d6efd" /> Email
                  </a>
                </div>
              </Column>
            </div>
          </div>
        }
        showCancel={false}
        showConfirm={false}
        skipCloseOnConfirm
        closable
      />
    </>
  );
}

export default MyIntegrations;
