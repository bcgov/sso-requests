import styled from 'styled-components';
import { Tabs, Tab } from '@bcgov-sso/common-react-components';
import { Integration } from 'interfaces/Request';
import { usesBceid, usesGithub, usesBcServicesCard } from '@app/helpers/integration';
import AdminRequestPanel from 'page-partials/admin-dashboard/AdminRequestPanel';
import AdminEventPanel from 'page-partials/admin-dashboard/AdminEventPanel';
import { LoggedInUser } from 'interfaces/team';
import BceidTabContent from './BceidTabContent';
import GithubTabContent from './GithubTabContent';
import BcServicesCardTabContent from './BcServicesCardTabContent';
import RoleEnvironment from '@app/page-partials/my-dashboard/RoleManagement/RoleEnvironment';
import { useState } from 'react';
import startCase from 'lodash.startcase';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

export type TabKey = 'details' | 'configuration-url' | 'events';

interface Props {
  currentUser: LoggedInUser;
  integration?: Integration;
  defaultTabKey: TabKey;
  setActiveKey: Function;
  activeKey?: TabKey;
  setRows: Function;
}

function AdminTabs({
  currentUser,
  integration,
  defaultTabKey,
  setActiveKey,
  setRows,
  activeKey = defaultTabKey,
}: Props) {
  const [environment, setEnvironment] = useState('dev');
  const showRolesTabIf = !integration?.archived && !integration?.apiServiceAccount && currentUser.isAdmin;
  const showEventsTabIf = currentUser.isAdmin;
  if (!integration) return null;
  const { environments = [] } = integration;

  const hasProd = environments.includes('prod');

  const hasBceid = usesBceid(integration);
  const hasBceidProd = hasBceid && hasProd;

  const hasGithub = usesGithub(integration);
  const hasGithubProd = hasGithub && hasProd;

  const hasBcServicesCard = usesBcServicesCard(integration);
  const hasBcServicesCardProd = hasBcServicesCard && hasProd;

  const handleBceidApproved = () => setRows();
  const handleGithubApproved = () => setRows();
  const handleDigitCredentialApproved = () => setRows();
  const handleBcServicesCardApproved = () => setRows();

  return (
    <>
      <Tabs activeKey={activeKey} onChange={(k: any) => setActiveKey(k)} tabBarGutter={30}>
        <Tab key="details" tab="Details">
          <TabWrapper>
            <AdminRequestPanel currentUser={currentUser} request={integration} onUpdate={setRows} />
          </TabWrapper>
        </Tab>
        {hasBceidProd && (
          <Tab key="bceid-prod" tab="BCeID Prod">
            <BceidTabContent integration={integration} onApproved={handleBceidApproved} />
          </Tab>
        )}
        {hasGithubProd && (
          <Tab key="github-prod" tab="GitHub Prod">
            <GithubTabContent integration={integration} onApproved={handleGithubApproved} />
          </Tab>
        )}
        {hasBcServicesCardProd && (
          <Tab key="bcsc-prod" tab="BC Services Card Prod">
            <BcServicesCardTabContent integration={integration} onApproved={handleBcServicesCardApproved} />
          </Tab>
        )}

        {showEventsTabIf && (
          <Tab key="events" tab="Events">
            <TabWrapper>
              <AdminEventPanel requestId={integration.id} />
            </TabWrapper>
          </Tab>
        )}

        {showRolesTabIf && (
          <Tab key="roles" tab="Roles">
            <TabWrapper>
              <Tabs onChange={setEnvironment} activeKey={environment} tabBarGutter={30} destroyInactiveTabPane={true}>
                <br />
                {environments.map((env) => (
                  <Tab key={env} tab={startCase(env)}>
                    <RoleEnvironment environment={env} integration={integration} viewOnly={true} />
                  </Tab>
                ))}
              </Tabs>
            </TabWrapper>
          </Tab>
        )}
      </Tabs>
    </>
  );
}

export default AdminTabs;
