import 'bootstrap/dist/css/bootstrap.min.css';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Panel from 'components/Panel';
import { RequestsContext } from 'pages/my-requests';
import { useContext } from 'react';
import { RequestReducerState } from 'reducers/requestReducer';
import { getInstallation } from 'services/keycloak';

const environments = [
  { title: 'Dev Configuration', env: 'dev' },
  { title: 'Test Configuration', env: 'test' },
  { title: 'Prod Configuration', env: 'prod' },
];

function RequestInfoTabs() {
  const { state, dispatch } = useContext(RequestsContext);
  const { selectedRequest, requests } = state as RequestReducerState;
  if (!selectedRequest) return null;

  const handleSelection = async (env: string) => {
    dispatch({ type: 'setEnvironment', payload: env });
    dispatch({ type: 'loadInstallation' });
    const installation = await getInstallation(selectedRequest.id);
    dispatch({ type: 'setInstallation', payload: installation });
  };

  return (
    <>
      <Tabs>
        {environments.map((env) => (
          <Tab eventKey={env.title} key={env.title} title={env.title} onEnter={() => handleSelection(env.env)}>
            <Panel />
          </Tab>
        ))}
      </Tabs>
    </>
  );
}

export default RequestInfoTabs;
