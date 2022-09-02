import styled from 'styled-components';
import { Tabs, Tab } from '@bcgov-sso/common-react-components';
import { Integration } from 'interfaces/Request';

import Button from '@button-inc/bcgov-theme/Button';
import { usesBceid } from 'utils/helpers';
import AdminRequestPanel from 'page-partials/admin-dashboard/AdminRequestPanel';
import AdminEventPanel from 'page-partials/admin-dashboard/AdminEventPanel';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';
import { updateRequest } from 'services/request';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import { LoggedInUser } from 'interfaces/team';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

export type TabKey = 'details' | 'configuration-url' | 'events';

interface Props {
  currentUser: LoggedInUser;
  selectedRequest?: Integration;
  defaultTabKey: TabKey;
  setActiveKey: Function;
  activeKey?: TabKey;
  setRows: Function;
}

function AdminTabs({
  currentUser,
  selectedRequest,
  defaultTabKey,
  setActiveKey,
  setRows,
  activeKey = defaultTabKey,
}: Props) {
  if (!selectedRequest) return null;
  const { environments = [], status, bceidApproved } = selectedRequest;
  const hasBceid = usesBceid(selectedRequest);
  const hasBceidProd = hasBceid && environments.includes('prod');
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
          integration={selectedRequest}
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
    const [, err] = await updateRequest(
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
      <Tabs activeKey={activeKey} onChange={(k: any) => setActiveKey(k)} tabBarGutter={30}>
        <Tab key="details" tab="Details">
          <TabWrapper>
            <AdminRequestPanel currentUser={currentUser} request={selectedRequest} onUpdate={setRows} />
          </TabWrapper>
        </Tab>
        {hasBceid && (
          <Tab key="prod-configuration" tab="Prod Configuration">
            <TabWrapper>
              <br />
              {ProductionPanel}
            </TabWrapper>
          </Tab>
        )}
        <Tab key="events" tab="Events">
          <TabWrapper>
            <AdminEventPanel requestId={selectedRequest.id} />
          </TabWrapper>
        </Tab>
      </Tabs>
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
