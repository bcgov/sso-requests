import React, { Dispatch, SetStateAction } from 'react';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import SecretsPanel from 'page-partials/my-dashboard/SecretsPanel';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { getStatusDisplayName } from 'utils/status';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import UserEventPanel from 'components/UserEventPanel';
import { RequestTabs } from 'components/RequestTabs';
import { usesBceid } from 'utils/helpers';
import { NumberedContents } from '@bcgov-sso/common-react-components';
import BceidStatus from 'components/BceidStatus';
import DefaultTitle from 'components/SHeader3';
import { $setPanelTab } from 'dispatchers/requestDispatcher';
import { Request } from 'interfaces/Request';
import { DashboardReducerState } from 'reducers/dashboardReducer';

const Title = styled(DefaultTitle)`
  margin-top: 10px;
`;

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

export type TabKey = 'installation-json' | 'configuration-url' | 'history';

const joinEnvs = (integration: Request) => {
  if (!integration?.environments) return '';

  const envs = [];
  if (integration.environments.includes('dev')) envs.push('Dev');
  if (integration.environments.includes('test')) envs.push('Test');
  if (integration.environments.includes('prod')) envs.push('Prod');

  let result = '';
  envs.forEach((env, index) => {
    result += env;
    if (envs.length - index === 2) {
      result += ' and ';
    } else if (envs.length - index >= 2) {
      result += ', ';
    }
  });

  return `${result} environment${envs.length > 1 ? 's' : ''}`;
};

interface Props {
  integration: Request;
  state: DashboardReducerState;
  dispatch: Dispatch<SetStateAction<any>>;
}

function IntegrationInfoTabs({ integration, state, dispatch }: Props) {
  const { panelTab } = state;
  if (!integration) return null;

  const { status, environments = [], bceidApproved } = integration;
  const displayStatus = getStatusDisplayName(status || 'draft');
  const awaitingBceidProd = usesBceid(integration) && environments.includes('prod') && !bceidApproved;
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
                title={`Access to ${joinEnvs(integration)} - approx 20 mins`}
              />
            )}
          </TabWrapper>
        </Tab>
      </RequestTabs>
    );
  } else if (displayStatus === 'Completed') {
    panel = (
      <>
        <RequestTabs activeKey={panelTab} mountOnEnter={true} onSelect={(k: TabKey) => dispatch($setPanelTab(k))}>
          <Tab eventKey="installation-json" title="Installation JSON">
            <TabWrapper>
              <InstallationPanel selectedRequest={integration} />
            </TabWrapper>
            {awaitingBceidProd && (
              <>
                <Title>Production Status</Title>
                <BceidStatus request={integration} />
              </>
            )}
          </Tab>
          <Tab eventKey="user-roles" title="Assign Users to Roles">
            <TabWrapper>
              <UserRoles selectedRequest={integration} />
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
      </>
    );
  }

  return panel;
}

export default IntegrationInfoTabs;
