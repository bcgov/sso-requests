import { useContext, useState } from 'react';
import styled from 'styled-components';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import ConfigurationUrlPanel from 'components/ConfigurationUrlPanel';
import { RequestsContext } from 'pages/my-requests';
import { getStatusDisplayName } from 'utils/status';
import { Request } from 'interfaces/Request';
import { SUBTITLE_FONT_SIZE, SECONDARY_FONT_COLOR } from 'styles/theme';

const RequestTabs = styled(Tabs)`
  .nav-link {
    color: ${SECONDARY_FONT_COLOR} !important;
    height: 30px !important;
    font-size: ${SUBTITLE_FONT_SIZE} !important;
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

interface Props {
  selectedRequest: Request;
}

function RequestInfoTabs({ selectedRequest }: Props) {
  const { dispatch } = useContext(RequestsContext);
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
    panel = (
      <>
        <br />
        <Alert variant="info">
          <div>
            <strong>We&apos;ve got your request.</strong>
          </div>
          <div>
            <p>
              It takes several minutes to automate the completion of your SSO integration request. You can either wait
              for an email that will come to the requestor&apos;s inbox, or wait 45 minutes and then do a refresh. If
              you would prefer to interact with a human, please reach out to us.
            </p>
          </div>
        </Alert>
      </>
    );
  } else if (displayStatus === 'Completed') {
    panel = (
      <RequestTabs>
        <Tab eventKey="installation-json" title="Installation JSON">
          <TabWrapper>
            <InstallationPanel selectedRequest={selectedRequest} />
          </TabWrapper>
        </Tab>
        <Tab eventKey="configuration-url" title="Configuration URIs">
          <TabWrapper>
            <ConfigurationUrlPanel selectedRequest={selectedRequest} />
          </TabWrapper>
        </Tab>
      </RequestTabs>
    );
  }

  return panel;
}

export default RequestInfoTabs;
