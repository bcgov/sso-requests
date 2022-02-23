import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import SecretsPanel from 'page-partials/my-dashboard/SecretsPanel';
import { getStatusDisplayName } from 'utils/status';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import UserEventPanel from 'components/UserEventPanel';
import { RequestTabs } from 'components/RequestTabs';
import { usesBceid } from 'utils/helpers';
import { NumberedContents } from '@bcgov-sso/common-react-components';
import BceidStatus from 'components/BceidStatus';
import DefaultTitle from 'components/SHeader3';
import { useContext } from 'react';
import { RequestsContext } from 'pages/my-dashboard';
import { $setPanelTab } from 'dispatchers/requestDispatcher';
import { Request } from 'interfaces/Request';

const Title = styled(DefaultTitle)`
  margin-top: 10px;
`;

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

export type TabKey = 'installation-json' | 'configuration-url' | 'history';

interface Props {
  integration: Request;
}

function RequestInfoTabs({ integration }: Props) {
  const { state, dispatch } = useContext(RequestsContext);
  const { panelTab } = state;
  if (!integration) return null;

  const { status, bceidApproved } = integration;
  const displayStatus = getStatusDisplayName(status || 'draft');
  const awaitingBceidProd = usesBceid(integration?.realm) && integration.prod && !bceidApproved;
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
                  <SubmittedStatusIndicator selectedRequest={integration} />
                  <br />
                </NumberedContents>
                <NumberedContents number={2} title="Access to Prod environment - (TBD)" variant="secondary">
                  <BceidStatus request={integration} />
                </NumberedContents>
              </>
            ) : (
              <SubmittedStatusIndicator
                selectedRequest={integration}
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
        <RequestTabs activeKey={panelTab} onSelect={(k: TabKey) => dispatch($setPanelTab(k))}>
          <Tab eventKey="installation-json" title="Installation JSON">
            <TabWrapper>
              <InstallationPanel selectedRequest={integration} />
            </TabWrapper>
          </Tab>
          {!integration.publicAccess && (
            <Tab eventKey="configuration-url" title="Secrets">
              <TabWrapper>
                <SecretsPanel selectedRequest={integration} />
              </TabWrapper>
            </Tab>
          )}
          <Tab eventKey="history" title="History">
            <TabWrapper>
              <UserEventPanel requestId={integration.id} />
            </TabWrapper>
          </Tab>
        </RequestTabs>
        {awaitingBceidProd && (
          <>
            <Title>Production Status</Title>
            <BceidStatus request={integration} />
          </>
        )}
      </>
    );
  }

  return panel;
}

export default RequestInfoTabs;
