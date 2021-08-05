import { useContext, useState } from 'react';
import styled from 'styled-components';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import ConfigurationUrlPanel from 'components/ConfigurationUrlPanel';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { getStatusDisplayName } from 'utils/status';
import type { Environment } from 'interfaces/types';

const RequestTabs = styled(Tabs)`
  .nav-link {
    height: 30px !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    padding-top: 0; !important;
    border-bottom: 1px solid #707070;
    border-top: unset !important;
    border-left: unset !important;
    border-right: unset !important;
  }
  .nav-link.active {
    background-color: unset !important;
    border-bottom: 3px solid orange;
  }
`;

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

const environments: { title: string; name: Environment }[] = [
  { title: 'Dev Configuration', name: 'dev' },
  { title: 'Test Configuration', name: 'test' },
  { title: 'Prod Configuration', name: 'prod' },
];

const timePassed = (time: string) => {
  return new Date().getTime() - new Date(time).getTime();
};

const ONE_MIN = 60 * 1000;
const FIVE_MIN = 5 * ONE_MIN;

function RequestInfoTabs() {
  const { state } = useContext(RequestsContext);
  const [environment, setEnvironment] = useState<Environment>(environments[0].name);

  const { selectedRequest } = state as RequestReducerState;
  if (!selectedRequest) return null;

  const displayStatus = getStatusDisplayName(selectedRequest.status || 'draft');

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
  } else if (displayStatus === 'Request Submitted') {
    if (selectedRequest.prNumber) {
      if (timePassed(selectedRequest.updatedAt || '') > FIVE_MIN) {
        panel = (
          <>
            <br />
            <Alert variant="info">
              <div>
                <strong>Your URI request has been received and is under review.</strong>
              </div>
            </Alert>
          </>
        );
      } else {
        panel = (
          <>
            <br />
            <Alert variant="info">
              <div>
                <strong>Your request is successfully submitted.</strong>
              </div>
              <div>
                {`Your updates will be ready in just a moment… However, if you experience a delay, don't hesitate to
                contact us via the toolbar.`}
              </div>
            </Alert>
          </>
        );
      }
    } else {
      if (timePassed(selectedRequest.updatedAt || '') > FIVE_MIN) {
        panel = (
          <>
            <br />
            <Alert variant="info">
              <div>
                <strong>Your request has been received and is under review.</strong>
              </div>
            </Alert>
          </>
        );
      } else {
        panel = (
          <>
            <br />
            <Alert variant="info">
              <div>
                <strong>Your request is successfully submitted.</strong>
              </div>
              <div>
                {`Your project will be ready in just a moment… However, if you experience a delay, don't hesitate to
                contact us via the toolbar.`}
              </div>
            </Alert>
          </>
        );
      }
    }
  } else if (displayStatus === 'Active Project') {
    panel = (
      <RequestTabs>
        <Tab eventKey="configuration-url" title="Configuration URIs">
          <TabWrapper>
            <ConfigurationUrlPanel />
          </TabWrapper>
        </Tab>

        <Tab eventKey="installation-json" title="Installation JSON">
          <TabWrapper>
            <InstallationPanel request={selectedRequest} />
          </TabWrapper>
        </Tab>
      </RequestTabs>
    );
  }

  return panel;
}

export default RequestInfoTabs;
