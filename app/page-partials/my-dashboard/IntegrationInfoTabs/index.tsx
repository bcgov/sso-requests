import React, { Dispatch, SetStateAction, Children, cloneElement } from 'react';
import styled from 'styled-components';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import SecretsPanel from 'page-partials/my-dashboard/SecretsPanel';
import ClientRoles from 'page-partials/my-dashboard/ClientRoles';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { getStatusDisplayName } from 'utils/status';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import UserEventPanel from 'components/UserEventPanel';
import { checkIfBceidProdApplying, checkIfGithubProdApplying } from 'utils/helpers';
import { usesBceid, usesGithub } from '@app/helpers/integration';
import { Border, Header, Tabs, Tab } from '@bcgov-sso/common-react-components';
import { $setPanelTab } from 'dispatchers/requestDispatcher';
import { Integration } from 'interfaces/Request';
import { DashboardReducerState } from 'reducers/dashboardReducer';
import Grid from '@button-inc/bcgov-theme/Grid';
import Link from '@button-inc/bcgov-theme/Link';
import padStart from 'lodash.padstart';
import { SubTitle, ApprovalContext } from './shared';
import BceidStatusPanel from './BceidStatusPanel';
import GithubStatusPanel from './GithubStatusPanel';

const TabWrapper = styled.div<{ short?: boolean }>`
  padding-left: 1rem;
  padding-right: 1rem;
  ${(props) => (props.short ? 'max-width: 800px;' : '')}
`;

const Requester = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #000;
  margin-bottom: 1rem;
`;

export type TabKey = 'installation-json' | 'configuration-url' | 'history';

const joinEnvs = (integration: Integration) => {
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

const IntegrationWrapper = ({ integration, children }: { integration: Integration; children: React.ReactNode }) => {
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
  approvalContext,
}: {
  integration: Integration;
  approvalContext: ApprovalContext;
}) => {
  return (
    <Tab key="installation-json" tab="Technical Details">
      <TabWrapper short={false}>
        <Grid cols={15}>
          <Grid.Row gutter={[]}>
            <Grid.Col span={7}>
              <InstallationPanel integration={integration} />
            </Grid.Col>
            <Grid.Col span={1}></Grid.Col>
            <Grid.Col span={7}>
              <BceidStatusPanel integration={integration} approvalContext={approvalContext} />
              <GithubStatusPanel integration={integration} approvalContext={approvalContext} />
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </TabWrapper>
    </Tab>
  );
};

const getProgressTab = ({
  integration,
  approvalContext,
}: {
  integration: Integration;
  approvalContext: ApprovalContext;
}) => {
  return (
    <Tab key="installation-json" tab="Technical Details">
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
              <BceidStatusPanel integration={integration} approvalContext={approvalContext} />
              <GithubStatusPanel integration={integration} approvalContext={approvalContext} />
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </TabWrapper>
    </Tab>
  );
};

const getApprovalProgressTab = ({
  integration,
  approvalContext,
}: {
  integration: Integration;
  approvalContext: ApprovalContext;
}) => {
  return (
    <Tab key="installation-json" tab="Technical Details">
      <TabWrapper short={false}>
        <Grid cols={15}>
          <Grid.Row gutter={[]}>
            <Grid.Col span={7}>
              <InstallationPanel integration={integration} />
            </Grid.Col>
            <Grid.Col span={1}></Grid.Col>
            <Grid.Col span={7} align={'center'}>
              <BceidStatusPanel integration={integration} approvalContext={approvalContext} />
              <GithubStatusPanel integration={integration} approvalContext={approvalContext} />
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </TabWrapper>
    </Tab>
  );
};

const getRoleManagementTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key="client-roles" tab="Role Management">
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

const getUserAssignmentTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key="user-roles" tab="Assign Users to Roles">
      <TabWrapper>
        <UserRoles selectedRequest={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getSecretsTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key="secret" tab="Secrets">
      <TabWrapper short={true}>
        <SecretsPanel selectedRequest={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getHistoryTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key="history" tab="Change History">
      <TabWrapper short={true}>
        <UserEventPanel requestId={integration.id} />
      </TabWrapper>
    </Tab>
  );
};

interface Props {
  integration: Integration;
  state: DashboardReducerState;
  dispatch: Dispatch<SetStateAction<any>>;
}

function IntegrationInfoTabs({ integration, state, dispatch }: Props) {
  const { panelTab } = state;
  if (!integration) return null;

  const { status, environments = [], bceidApproved = false, githubApproved = false } = integration;
  const displayStatus = getStatusDisplayName(status || 'draft');
  const hasProd = environments.includes('prod');
  const hasBceid = usesBceid(integration);
  const hasGithub = usesGithub(integration);
  const awaitingBceidProd = hasBceid && hasProd && !bceidApproved;
  const awaitingGithubProd = hasGithub && hasProd && !githubApproved;
  const bceidProdApplying = checkIfBceidProdApplying(integration);
  const githubProdApplying = checkIfGithubProdApplying(integration);

  const approvalContext = {
    hasProd,
    hasBceid,
    hasGithub,
    bceidApproved,
    githubApproved,
    awaitingBceidProd,
    awaitingGithubProd,
    bceidProdApplying,
    githubProdApplying,
  };

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
    if (bceidProdApplying || githubProdApplying) {
      tabs.push(getApprovalProgressTab({ integration, approvalContext }));
    } else {
      tabs.push(getProgressTab({ integration, approvalContext }));
    }
  } else if (displayStatus === 'Completed') {
    tabs.push(getInstallationTab({ integration, approvalContext }));

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
      <Tabs
        activeKey={panelTab}
        onChange={(k: any) => dispatch($setPanelTab(k))}
        tabBarGutter={30}
        destroyInactiveTabPane={true}
      >
        {tabs}
      </Tabs>
    </IntegrationWrapper>
  );
}

export default IntegrationInfoTabs;
