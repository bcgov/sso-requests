import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import ConfigurationUrlPanel from 'components/ConfigurationUrlPanel';
import { getStatusDisplayName } from 'utils/status';
import { Request } from 'interfaces/Request';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import UserEventPanel from 'components/UserEventPanel';
import { RequestTabs } from 'components/RequestTabs';
import { usesBceid } from 'utils/helpers';
import { NumberedContents } from '@bcgov-sso/common-react-components';
import BceidStatus from 'components/BceidStatus';
import DefaultTitle from 'components/SHeader3';

const Title = styled(DefaultTitle)`
  margin-top: 10px;
`;

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
  if (!selectedRequest) return null;
  const { status, bceidApproved } = selectedRequest;
  const displayStatus = getStatusDisplayName(status || 'draft');
  const awaitingBceidProd = usesBceid(selectedRequest?.realm) && selectedRequest.prod && !bceidApproved;
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
    panel = (
      <RequestTabs activeKey="Integration-request-summary">
        <Tab eventKey="Integration-request-summary" title="Integration Request Summary">
          <TabWrapper>
            {awaitingBceidProd ? (
              <>
                <NumberedContents
                  number={1}
                  title="Access to Dev and/or Test environment(s) - approx 20 mins"
                  variant="secondary"
                >
                  <SubmittedStatusIndicator selectedRequest={selectedRequest} />
                  <br />
                </NumberedContents>
                <NumberedContents number={2} title="Access to Prod environment - (TBD)" variant="secondary">
                  <BceidStatus request={selectedRequest} />
                </NumberedContents>
              </>
            ) : (
              <SubmittedStatusIndicator
                selectedRequest={selectedRequest}
                title="Access to environment(s) - approx 20 mins"
              />
            )}
          </TabWrapper>
        </Tab>
      </RequestTabs>
    );
  } else if (displayStatus === 'Completed') {
    panel = (
      <>
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
        {awaitingBceidProd && (
          <>
            <Title>Production Status</Title>
            <BceidStatus request={selectedRequest} />
          </>
        )}
      </>
    );
  }

  return panel;
}

export default RequestInfoTabs;
