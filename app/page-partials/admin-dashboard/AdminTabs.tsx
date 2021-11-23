import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { Request } from 'interfaces/Request';
import { RequestTabs } from 'components/RequestTabs';
import Button from '@button-inc/bcgov-theme/Button';
import { usesBceid } from 'utils/helpers';
import AdminRequestPanel from 'page-partials/admin-dashboard/AdminRequestPanel';
import AdminEventPanel from 'page-partials/admin-dashboard/AdminEventPanel';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

export type TabKey = 'details' | 'configuration-url' | 'events';

interface Props {
  selectedRequest?: Request;
  defaultTabKey: TabKey;
  setActiveKey: Function;
  activeKey?: TabKey;
}

function RequestInfoTabs({ selectedRequest, defaultTabKey, setActiveKey, activeKey = defaultTabKey }: Props) {
  if (!selectedRequest) return null;
  const { realm, prod } = selectedRequest;
  const hasBceidProd = usesBceid(realm) && prod;
  const modalId = 'bceid-approval-modal';

  const openModal = () => (window.location.hash = modalId);
  const ProductionPanel = hasBceidProd ? (
    <>
      <p>To begin the BCeID integration in production, Click Below.</p>
      <Button onClick={openModal}>Approve Production</Button>
    </>
  ) : (
    <>
      <p>This user has not requested a BCeID production environment.</p>
    </>
  );

  return (
    <>
      <RequestTabs activeKey={activeKey} onSelect={(k: TabKey) => setActiveKey(k)}>
        <Tab eventKey="details" title="Details">
          <TabWrapper>
            <AdminRequestPanel request={selectedRequest} />
          </TabWrapper>
        </Tab>
        <Tab eventKey="prod-configuration" title="Prod Configuration">
          <TabWrapper>
            <br />
            {ProductionPanel}
          </TabWrapper>
        </Tab>
        <Tab eventKey="events" title="Events">
          <TabWrapper>
            <AdminEventPanel requestId={selectedRequest.id} />
          </TabWrapper>
        </Tab>
      </RequestTabs>
      <CenteredModal
        id={modalId}
        content="Are you sure you want to approve this integration for production?"
        onConfirm={() => {}}
        icon={faExclamationTriangle}
        title="Approve Production"
      />
    </>
  );
}

export default RequestInfoTabs;
