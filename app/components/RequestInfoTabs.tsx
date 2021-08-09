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
import { Request } from 'interfaces/Request';

const RequestTabs = styled(Tabs)`
  .nav-link {
    height: 30px !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    padding-top: 0; !important;
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

const timePassed = (time: string) => {
  return new Date().getTime() - new Date(time).getTime();
};

const ONE_MIN = 60 * 1000;
const FIVE_MIN = 5 * ONE_MIN;

interface Props {
  selectedRequest: Request;
}

function RequestInfoTabs({ selectedRequest }: Props) {
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
  } else if (displayStatus === 'Submitted') {
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
  } else if (displayStatus === 'Completed') {
    panel = (
      <RequestTabs>
        <Tab eventKey="configuration-url" title="Configuration URIs">
          <TabWrapper>
            <ConfigurationUrlPanel selectedRequest={selectedRequest} />
          </TabWrapper>
        </Tab>

        <Tab eventKey="installation-json" title="Installation JSON">
          <TabWrapper>
            <InstallationPanel selectedRequest={selectedRequest} />
          </TabWrapper>
        </Tab>
      </RequestTabs>
    );
  }

  return panel;
}

export default RequestInfoTabs;
