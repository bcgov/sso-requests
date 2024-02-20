import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import SecretsPanel from 'page-partials/my-dashboard/SecretsPanel';
import ClientRoles from 'page-partials/my-dashboard/RoleManagement';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { getStatusDisplayName } from 'utils/status';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import UserEventPanel from 'components/UserEventPanel';
import {
  checkIfBceidProdApplying,
  checkIfGithubProdApplying,
  checkIfDigitalCredentialProdApplying,
} from 'utils/helpers';
import { usesBceid, usesGithub, usesDigitalCredential } from '@app/helpers/integration';
import { Border, Tabs, Tab } from '@bcgov-sso/common-react-components';
import { Integration } from 'interfaces/Request';
import Grid from '@button-inc/bcgov-theme/Grid';
import Link from '@button-inc/bcgov-theme/Link';
import padStart from 'lodash.padstart';
import { SubTitle, ApprovalContext } from './shared';
import BceidStatusPanel from './BceidStatusPanel';
import GithubStatusPanel from './GithubStatusPanel';
import ServiceAccountRoles from 'page-partials/my-dashboard/ServiceAccountRoles';
import DigitalCredentialPanel from './DigitalCredentialPanel';
import MetricsPanel from './MetricsPanel';
import { ErrorMessage } from '@app/components/MessageBox';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { formatWikiURL } from 'utils/constants';

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

const AlignCenter = styled.div`
  text-align: center;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const BottomMargin = styled.div`
  margin-bottom: 60px;
`;

const TAB_DETAILS = 'tech-details';
const TAB_ROLE_MANAGEMENT = 'role-management';
const TAB_USER_ROLE_MANAGEMENT = 'user-role-management';
const TAB_SERVICE_ACCOUNT_ROLE_MANAGEMENT = 'service-account-role-management';
const TAB_SECRET = 'secret';
const TAB_HISTORY = 'history';
const TAB_METRICS = 'metrics';

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
      <h2>INTEGRATION DETAILS - {padStart(String(integration.id), 8, '0')}</h2>
      <Border>{children}</Border>
    </>
  );
};

const getIntegrationErrorTab = () => {
  return (
    <Tab key={TAB_DETAILS} tab="Technical Details">
      <TabWrapper short={false}>
        <div style={{ display: 'inline-flex', margin: '20px 0 20px 0', background: '#FFCCCB', borderRadius: '5px' }}>
          <div style={{ padding: 5 }}>
            <ErrorMessage>
              Your request for an integration could not be completed. Please{' '}
              <Link external href="mailto:bcgov.sso@gov.bc.ca">
                contact the Pathfinder SSO Team
              </Link>
            </ErrorMessage>
          </div>
        </div>
      </TabWrapper>
    </Tab>
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
    <Tab key={TAB_DETAILS} tab="Technical Details">
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
              <DigitalCredentialPanel integration={integration} approvalContext={approvalContext} />
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </TabWrapper>
    </Tab>
  );
};

const getLoadingSpinner = () => {
  return (
    <Tab key={TAB_DETAILS} tab="Technical Details">
      <TabWrapper short={false}>
        <Grid cols={15}>
          <br />
          <AlignCenter>
            <TopMargin />
            <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
            <BottomMargin />
          </AlignCenter>
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
    <Tab key={TAB_DETAILS} tab="Technical Details">
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
              <DigitalCredentialPanel integration={integration} approvalContext={approvalContext} />
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
    <Tab key={TAB_DETAILS} tab="Technical Details">
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
              <DigitalCredentialPanel integration={integration} approvalContext={approvalContext} />
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </TabWrapper>
    </Tab>
  );
};

const getRoleManagementTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key={TAB_ROLE_MANAGEMENT} tab="Role Management">
      <TabWrapper>
        <br />
        <div>
          Please visit our{' '}
          <Link external href={formatWikiURL('Creating-a-Role')}>
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
    <Tab key={TAB_USER_ROLE_MANAGEMENT} tab="Assign Users to Roles">
      <TabWrapper>
        <UserRoles selectedRequest={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getServiceAccountAssignmentTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key={TAB_SERVICE_ACCOUNT_ROLE_MANAGEMENT} tab="Assign Service Account to Roles">
      <TabWrapper>
        <ServiceAccountRoles selectedRequest={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getSecretsTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key={TAB_SECRET} tab="Secrets">
      <TabWrapper short={true}>
        <SecretsPanel selectedRequest={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getMetricsTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key={TAB_METRICS} tab="Metrics">
      <TabWrapper short={false}>
        <MetricsPanel integration={integration} />
      </TabWrapper>
    </Tab>
  );
};

const getHistoryTab = ({ integration }: { integration: Integration }) => {
  return (
    <Tab key={TAB_HISTORY} tab="Change History">
      <TabWrapper short={true}>
        <UserEventPanel requestId={integration.id} />
      </TabWrapper>
    </Tab>
  );
};

interface Props {
  integration: Integration;
}

function IntegrationInfoTabs({ integration }: Props) {
  const [activeTab, setActiveTab] = useState(TAB_DETAILS);
  if (!integration) return null;

  const {
    status,
    environments = [],
    bceidApproved = false,
    githubApproved = false,
    digitalCredentialApproved = false,
  } = integration;
  const displayStatus = getStatusDisplayName(status || 'draft');
  const hasProd = environments.includes('prod');
  const hasBceid = usesBceid(integration);
  const hasGithub = usesGithub(integration);
  const hasDigitalCredential = usesDigitalCredential(integration);
  const awaitingBceidProd = hasBceid && hasProd && !bceidApproved;
  const awaitingGithubProd = hasGithub && hasProd && !githubApproved;
  const awaitingDigitalCredentialProd = hasDigitalCredential && hasProd && !digitalCredentialApproved;
  const bceidProdApplying = checkIfBceidProdApplying(integration);
  const githubProdApplying = checkIfGithubProdApplying(integration);
  const digitalCredentialProdApplying = checkIfDigitalCredentialProdApplying(integration);

  const approvalContext: ApprovalContext = {
    hasProd,
    hasBceid,
    hasGithub,
    hasDigitalCredential,
    bceidApproved,
    githubApproved,
    digitalCredentialApproved,
    awaitingBceidProd,
    awaitingGithubProd,
    awaitingDigitalCredentialProd,
    bceidProdApplying,
    githubProdApplying,
    digitalCredentialProdApplying,
  };

  const isGold = integration.serviceType === 'gold';
  const hasBrowserFlow = integration.authType !== 'service-account';
  const hasBothFlows = integration.authType === 'both';

  const handleTabClick = (key: any) => {
    setActiveTab(key);
  };

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
  const allowedTabs = [];

  // Integrations can potentially have no IDPs, e.g service accounts only.
  const digitalCredentialOnly =
    integration.devIdps?.length && integration.devIdps?.every((idp) => idp === 'digitalcredential');

  if (displayStatus === 'Submitted') {
    if (['planFailed', 'applyFailed'].includes(integration.status as string)) {
      tabs.push(getIntegrationErrorTab());
      allowedTabs.push(TAB_DETAILS);
    } else {
      tabs.push(getLoadingSpinner());
      allowedTabs.push(TAB_DETAILS);
    }
  } else if (displayStatus === 'Completed') {
    tabs.push(getInstallationTab({ integration, approvalContext }));
    allowedTabs.push(TAB_DETAILS);
    // Exclude role management from integrations with only DC
    if (!digitalCredentialOnly) {
      tabs.push(getRoleManagementTab({ integration }));
      allowedTabs.push(TAB_ROLE_MANAGEMENT);
    }

    // Exclude user assignment from integrations with DC only
    if (isGold && hasBrowserFlow && !digitalCredentialOnly) {
      tabs.push(getUserAssignmentTab({ integration }));
      allowedTabs.push(TAB_USER_ROLE_MANAGEMENT);
    }

    if (isGold && (!hasBrowserFlow || hasBothFlows)) {
      tabs.push(getServiceAccountAssignmentTab({ integration }));
      allowedTabs.push(TAB_SERVICE_ACCOUNT_ROLE_MANAGEMENT);
    }

    if (!integration.publicAccess) {
      tabs.push(getSecretsTab({ integration }));
      allowedTabs.push(TAB_SECRET);
    }

    tabs.push(getHistoryTab({ integration }));
    allowedTabs.push(TAB_HISTORY);

    tabs.push(getMetricsTab({ integration }));
    allowedTabs.push(TAB_METRICS);
  }

  let activeKey = activeTab;

  if (!allowedTabs.includes(activeTab)) {
    activeKey = allowedTabs[0];
  }

  return (
    <IntegrationWrapper integration={integration}>
      <Tabs activeKey={activeKey} onChange={handleTabClick} tabBarGutter={30} destroyInactiveTabPane={true}>
        {tabs}
      </Tabs>
    </IntegrationWrapper>
  );
}

export default IntegrationInfoTabs;
