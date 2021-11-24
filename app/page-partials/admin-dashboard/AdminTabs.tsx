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
import { updateRequest } from 'services/request';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import { formatFilters, hasAnyPendingStatus } from 'utils/helpers';

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
  setRows: Function;
}

function AdminTabs({ selectedRequest, defaultTabKey, setActiveKey, setRows, activeKey = defaultTabKey }: Props) {
  if (!selectedRequest) return null;
  const { realm, prod, status, bceidApproved } = selectedRequest;
  const hasBceid = usesBceid(realm);
  const hasBceidProd = hasBceid && prod;
  const canApproveProduction = hasBceidProd && status === 'applied' && !bceidApproved;
  const awaitingProductionCompletion = hasBceidProd && status !== 'applied' && bceidApproved;
  const modalId = 'bceid-approval-modal';

  const openModal = () => (window.location.hash = modalId);

  let ProductionPanel;
  if (canApproveProduction) {
    ProductionPanel = (
      <>
        <p>To begin the BCeID integration in production, Click Below.</p>
        <Button onClick={openModal}>Approve Production</Button>
      </>
    );
  } else if (awaitingProductionCompletion) {
    ProductionPanel = (
      <>
        <SubmittedStatusIndicator
          selectedRequest={selectedRequest}
          title="The terraform script will take approximately 20 minutes to complete."
        />
      </>
    );
  } else {
    ProductionPanel = (
      <>
        <p>This request is {bceidApproved ? 'already approved.' : 'not ready to approve production.'}</p>
      </>
    );
  }

  const onConfirm = async () => {
    const [data, err] = await updateRequest(
      {
        ...selectedRequest,
        bceidApproved: true,
      },
      true,
    );
    if (!err) {
      setRows();
    }
  };

  return (
    <>
      <RequestTabs activeKey={activeKey} onSelect={(k: TabKey) => setActiveKey(k)}>
        <Tab eventKey="details" title="Details">
          <TabWrapper>
            <AdminRequestPanel request={selectedRequest} />
          </TabWrapper>
        </Tab>
        {hasBceid && (
          <Tab eventKey="prod-configuration" title="Prod Configuration">
            <TabWrapper>
              <br />
              {ProductionPanel}
            </TabWrapper>
          </Tab>
        )}
        <Tab eventKey="events" title="Events">
          <TabWrapper>
            <AdminEventPanel requestId={selectedRequest.id} />
          </TabWrapper>
        </Tab>
      </RequestTabs>
      <CenteredModal
        id={modalId}
        content="Are you sure you want to approve this integration for production?"
        onConfirm={onConfirm}
        icon={faExclamationTriangle}
        title="Approve Production"
      />
    </>
  );
}

export default AdminTabs;
