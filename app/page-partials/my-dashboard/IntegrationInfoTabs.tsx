import React, { Dispatch, SetStateAction, Children, cloneElement } from 'react';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import SecretsPanel from 'page-partials/my-dashboard/SecretsPanel';
import ClientRoles from 'page-partials/my-dashboard/ClientRoles';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { getStatusDisplayName } from 'utils/status';
import SubmittedStatusIndicator, { IntegrationProgressStatus } from 'components/SubmittedStatusIndicator';
import UserEventPanel from 'components/UserEventPanel';
import { RequestTabs } from 'components/RequestTabs';
import { usesBceid, checkIfBceidProdApplying } from 'utils/helpers';
import { Border, Header } from '@bcgov-sso/common-react-components';
import BceidStatus from 'components/BceidStatus';
import DefaultTitle from 'components/SHeader3';
import { $setPanelTab } from 'dispatchers/requestDispatcher';
import { Request } from 'interfaces/Request';
import { DashboardReducerState } from 'reducers/dashboardReducer';
import Grid from '@button-inc/bcgov-theme/Grid';
import Link from '@button-inc/bcgov-theme/Link';
import { padStart } from 'lodash';

const TabWrapper = styled.div<{ short?: boolean }>`
  padding-left: 1rem;
  padding-right: 1rem;
  ${(props) => (props.short ? 'max-width: 800px;' : '')}
`;

const SubTitle = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #000;
  border-bottom: 1px solid gray;
`;

const FlexStartBox = styled.div`
  display: flex;
  justify-content: flex-start;

  & > *:nth-child(1) {
    margin-right: 5px;
  }
`;

const Requester = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #000;
  margin-bottom: 1rem;
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

const IntegrationWrapper = ({ integration, children }: { integration: Request; children: React.ReactNode }) => {
  return (
    <>
      <Header variant="primary" size="lg">
        INTEGRATION DETAILS - {padStart(String(integration.id), 8, '0')}
      </Header>
      <Border>{children}</Border>
    </>
  );
};

const getInstallationTab = ({
  integration,
  awaitingBceidProd,
}: {
  integration: Request;
  awaitingBceidProd: boolean;
}) => {
  const { bceidApproved } = integration;
  const bceidInvolved = bceidApproved || awaitingBceidProd;

  return (
    <Tab key="installation-json" eventKey="installation-json" title="Technical Details">
      <TabWrapper short={false}>
        <Grid cols={15}>
          <Grid.Row gutter={[]}>
            <Grid.Col span={7}>
              <InstallationPanel integration={integration} />
            </Grid.Col>
            <Grid.Col span={1}></Grid.Col>
            <Grid.Col span={7}>
              {bceidInvolved && (
                <>
                  <br />
                  <SubTitle>Access to BCeID Prod</SubTitle>
                  <br />
                  {bceidApproved ? (
                    <FlexStartBox>
                      <div>
                        <FontAwesomeIcon icon={faCheckCircle} color="#2E8540" />
                      </div>
                      <div>
                        <span>Your integration is approved and available.</span>
                      </div>
                    </FlexStartBox>
                  ) : (
                    <BceidStatus integration={integration} />
                  )}
                </>
              )}
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </TabWrapper>
    </Tab>
  );
};

const getProgressTab = ({ integration, awaitingBceidProd }: { integration: Request; awaitingBceidProd: boolean }) => {
  return (
    <Tab key="installation-json" eventKey="installation-json" title="Technical Details">
      <TabWrapper short={false}>
        <Grid cols={15}>
          <br />
          <Grid.Row gutter={[]}>
            <Grid.Col span={7} align={'center'}>
              {integration.requester && <Requester>Submitted by: {integration.requester}</Requester>}
              <SubTitle>Access to environment(s) will be provided in approx 20 min</SubTitle>
              <SubmittedStatusIndicator integration={integration} />
            </Grid.Col>
            <Grid.Col span={1}></Grid.Col>
            <Grid.Col span={7} align={'center'}>
              {awaitingBceidProd && (
                <>
                  <br />
                  <SubTitle>Access to BCeID Prod</SubTitle>
                  <br />
                  <BceidStatus integration={integration} />
                </>
              )}
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </TabWrapper>
    </Tab>
  );
};

const getApprovalProgressTab = ({ integration }: { integration: Request }) => {
  return (
    <Tab key="installation-json" eventKey="installation-json" title="Technical Details">
      <TabWrapper short={false}>
        <Grid cols={15}>
          <Grid.Row gutter={[]}>
            <Grid.Col span={7}>
              <InstallationPanel integration={integration} />
            </Grid.Col>
            <Grid.Col span={1}></Grid.Col>
            <Grid.Col span={7} align={'center'}>
              <br />
              <SubTitle>Access to BCeID Prod</SubTitle>
              <br />
              <FlexStartBox>
                <div>
                  <FontAwesomeIcon icon={faCheckCircle} color="#2E8540" />
                </div>
                <div>
                  <span>
                    Your integration has been approved. Please wait approx. 10 min to get access to your installation
                    information access again.
                  </span>
                  <SubTitle>Progress Update</SubTitle>
                  <IntegrationProgressStatus integration={integration} />
                </div>
              </FlexStartBox>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </TabWrapper>
    </Tab>
  );
};

const getRoleManagementTab = ({ integration }: { integration: Request }) => {
  return (
    <Tab key="client-roles" eventKey="client-roles" title="Role Management">
      <TabWrapper>
        <br />
        <div>
          Please visit our{' '}
          <Link external href="https://github.com/bcgov/sso-keycloak/wiki/Creating-a-Role">
            wiki page
          </Link>{' '}
          for more information on roles.
        </div>
        <ClientRoles integration={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getUserAssignmentTab = ({ integration }: { integration: Request }) => {
  return (
    <Tab key="user-roles" eventKey="user-roles" title="Assign Users to Roles">
      <TabWrapper>
        <UserRoles selectedRequest={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getSecretsTab = ({ integration }: { integration: Request }) => {
  return (
    <Tab key="secret" eventKey="secret" title="Secrets">
      <TabWrapper short={true}>
        <SecretsPanel selectedRequest={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getHistoryTab = ({ integration }: { integration: Request }) => {
  return (
    <Tab key="history" eventKey="history" title="Change History">
      <TabWrapper short={true}>
        <UserEventPanel requestId={integration.id} />
      </TabWrapper>
    </Tab>
  );
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
  const bceidProdApplying = checkIfBceidProdApplying(integration);
  const isGold = integration.serviceType === 'gold';
  const hasBrowserFlow = integration.authType !== 'service-account';

  if (displayStatus === 'In Draft') {
    return (
      <IntegrationWrapper integration={integration}>
        <Alert variant="info">
          <div>
            <strong>Your request has not been submitted.</strong>
          </div>
          <div>To complete your request, click &quot;Edit&quot; button.</div>
        </Alert>
      </IntegrationWrapper>
    );
  }

  const tabs = [];

  if (displayStatus === 'Submitted') {
    if (bceidProdApplying) {
      tabs.push(getApprovalProgressTab({ integration }));
    } else {
      tabs.push(getProgressTab({ integration, awaitingBceidProd }));
    }
  } else if (displayStatus === 'Completed') {
    tabs.push(getInstallationTab({ integration, awaitingBceidProd }));

    if (isGold && hasBrowserFlow) {
      tabs.push(getRoleManagementTab({ integration }), getUserAssignmentTab({ integration }));
    }

    if (!integration.publicAccess) {
      tabs.push(getSecretsTab({ integration }));
    }

    tabs.push(getHistoryTab({ integration }));
  }

  return (
    <IntegrationWrapper integration={integration}>
      <RequestTabs
        activeKey={panelTab}
        mountOnEnter={true}
        unmountOnExit={true}
        onSelect={(k: any) => dispatch($setPanelTab(k))}
      >
        {tabs}
      </RequestTabs>
    </IntegrationWrapper>
  );
}

export default IntegrationInfoTabs;
