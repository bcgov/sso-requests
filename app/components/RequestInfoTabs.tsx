import { useContext, useState } from 'react';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import RequestInfoPanel from 'components/RequestInfoPanel';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import type { Environment } from 'interfaces/Environment';

const environments: { title: string; name: Environment }[] = [
  { title: 'Dev Configuration', name: 'dev' },
  { title: 'Test Configuration', name: 'test' },
  { title: 'Prod Configuration', name: 'prod' },
];

function RequestInfoTabs() {
  const { state } = useContext(RequestsContext);
  const [environment, setEnvironment] = useState<Environment>(environments[0].name);

  const { selectedRequest, requests } = state as RequestReducerState;
  if (!selectedRequest) return null;

  const handleSelection = (env: Environment) => {
    setEnvironment(env);
  };

  return (
    <Tabs>
      {environments.map((env) => (
        <Tab eventKey={env.title} key={env.title} title={env.title} onEnter={() => handleSelection(env.name)}>
          <RequestInfoPanel panelEnv={env.name} environment={environment} />
        </Tab>
      ))}
    </Tabs>
  );
}

export default RequestInfoTabs;
