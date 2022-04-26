import React, { Dispatch, SetStateAction } from 'react';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import SecretsPanel from 'page-partials/my-dashboard/SecretsPanel';
import ClientRoles from 'page-partials/my-dashboard/ClientRoles';
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

const TabWrapper = styled.div<{ short?: boolean }>`
  padding-left: 1rem;
  padding-right: 1rem;
  ${(props) => (props.short ? 'max-width: 800px;' : '')}
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
  const isGold = integration.serviceType === 'gold';

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
          <TabWrapper short={true}>
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
        <RequestTabs
          activeKey={panelTab}
          mountOnEnter={true}
          unmountOnExit={true}
          onSelect={(k: TabKey) => dispatch($setPanelTab(k))}
        >
          <Tab eventKey="installation-json" title="Installation JSON">
            <TabWrapper short={true}>
              <InstallationPanel selectedRequest={integration} />
              {awaitingBceidProd && (
                <>
                  <Title>Production Status</Title>
                  <BceidStatus request={integration} />
                </>
              )}
            </TabWrapper>
          </Tab>
          {isGold && (
            <Tab eventKey="client-roles" title="Role Management">
              <TabWrapper>
                <ClientRoles selectedRequest={integration} />
              </TabWrapper>
            </Tab>
          )}
          {isGold && (
            <Tab eventKey="user-roles" title="Assign Users to Roles">
              <TabWrapper>
                <UserRoles selectedRequest={integration} />
              </TabWrapper>
            </Tab>
          )}
          {!integration.publicAccess && (
            <Tab eventKey="configuration-url" title="Secrets">
              <TabWrapper short={true}>
                <SecretsPanel selectedRequest={integration} />
              </TabWrapper>
            </Tab>
          )}
          <Tab eventKey="history" title="History">
            <TabWrapper short={true}>
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
