import { useContext } from 'react';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import ConfigurationUrlPanel from 'components/ConfigurationUrlPanel';
import { RequestsContext } from 'pages/my-requests';
import { getStatusDisplayName } from 'utils/status';
import { Request } from 'interfaces/Request';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import UserEventPanel from 'components/UserEventPanel';
import { RequestTabs } from 'components/RequestTabs';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

export type TabKey = 'installation-json' | 'configuration-url' | 'data-changes';

interface Props {
  selectedRequest: Request;
  defaultTabKey: TabKey;
  setActiveKey: Function;
  activeKey: TabKey;
}

function RequestInfoTabs({ selectedRequest, defaultTabKey, setActiveKey, activeKey = defaultTabKey }: Props) {
  const { dispatch } = useContext(RequestsContext);
  if (!selectedRequest) return null;
  const { status } = selectedRequest;
  const displayStatus = getStatusDisplayName(status || 'draft');

  let panel = null;
  if (displayStatus === 'In Draft') {
    panel = (
      <>
        <br />
        <Alert variant="info">
          <div>
            <strong>Your request has not been submitted.</strong>
          </div>
          <div>To complete your request, click &quot;Edit&quot; button.</div>
        </Alert>
      </>
    );
  } else if (displayStatus === 'Submitted') {
    panel = <SubmittedStatusIndicator selectedRequest={selectedRequest} />;
  } else if (displayStatus === 'Completed') {
    panel = (
      <RequestTabs activeKey={activeKey} onSelect={(k: TabKey) => setActiveKey(k)}>
        <Tab eventKey="installation-json" title="Installation JSON">
          <TabWrapper>
            <InstallationPanel selectedRequest={selectedRequest} />
          </TabWrapper>
        </Tab>
        <Tab eventKey="configuration-url" title="URIs & Secrets">
          <TabWrapper>
            <ConfigurationUrlPanel selectedRequest={selectedRequest} />
          </TabWrapper>
        </Tab>
        <Tab eventKey="data-changes" title="Data Changes">
          <TabWrapper>
            <UserEventPanel requestId={selectedRequest.id} />
          </TabWrapper>
        </Tab>
      </RequestTabs>
    );
  }

  return panel;
}

export default RequestInfoTabs;
