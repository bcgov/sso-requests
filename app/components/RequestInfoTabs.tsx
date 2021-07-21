import { useContext, useState } from 'react';
import styled from 'styled-components';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Alert from '@button-inc/bcgov-theme/Alert';
import RequestInfoPanel from 'components/RequestInfoPanel';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { getStatusDisplayName } from 'utils/status';
import type { Environment } from 'interfaces/types';

const RequestTabs = styled(Tabs)`
  .nav-link {
    border-top: unset !important;
    border-left: unset !important;
    border-right: unset !important;
  }
  .nav-link.active {
    background-color: unset !important;
    border-bottom: 3px solid orange;
  }
`;

const environments: { title: string; name: Environment }[] = [
  { title: 'Dev Configuration', name: 'dev' },
  { title: 'Test Configuration', name: 'test' },
  { title: 'Prod Configuration', name: 'prod' },
];

function RequestInfoTabs() {
  const { state } = useContext(RequestsContext);
  const [environment, setEnvironment] = useState<Environment>(environments[0].name);

  const { selectedRequest } = state as RequestReducerState;
  if (!selectedRequest) return null;

  const handleSelection = (env: Environment) => {
    setEnvironment(env);
  };

  const displayStatus = getStatusDisplayName(selectedRequest.status || 'draft');

  let panel = null;
  if (displayStatus === 'In Draft') {
    panel = (
      <>
        <br />
        <br />
        <Alert variant="info" content="Your request is in draft. Click the 'edit' button to finish the request." />
      </>
    );
  } else if (displayStatus === 'Request Submitted') {
    panel = (
      <>
        <br />
        <br />
        <Alert
          variant="info"
          content="Your request is successfully submitted. Return periodically to the dashboard for request status update."
        />
      </>
    );
  } else if (displayStatus === 'Active Project') {
    panel = (
      <RequestTabs>
        {environments.map((env) => (
          <Tab eventKey={env.title} key={env.title} title={env.title} onEnter={() => handleSelection(env.name)}>
            <RequestInfoPanel panelEnv={env.name} environment={environment} />
          </Tab>
        ))}
      </RequestTabs>
    );
  }

  return panel;
}

export default RequestInfoTabs;
