import styled from 'styled-components';
import { Tabs, Tab } from '@bcgov-sso/common-react-components';
import { Integration } from 'interfaces/Request';
import { usesBceid, usesGithub, usesBcServicesCard, usesSocial, usesOTP } from '@app/helpers/integration';
import AdminRequestPanel from 'page-partials/admin-dashboard/AdminRequestPanel';
import AdminEventPanel from 'page-partials/admin-dashboard/AdminEventPanel';
import { LoggedInUser } from 'interfaces/team';
import BceidTabContent from './BceidTabContent';
import GithubTabContent from './GithubTabContent';
import BcServicesCardTabContent from './BcServicesCardTabContent';
import SocialTabContent from './SocialTabContent';
import OTPTabContent from './OTPTabContent';
import RoleEnvironment from '@app/page-partials/my-dashboard/RoleManagement/RoleEnvironment';
import { useState } from 'react';
import startCase from 'lodash.startcase';
import {
  isBceidApprover,
  isBcServicesCardApprover,
  isGithubApprover,
  isOTPApprover,
  isSocialApprover,
} from '@app/utils/helpers';
import { hasAppPermission, appPermissions } from '@app/utils/authorize';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
  margin-top: 1rem;
`;

export type TabKey = 'details' | 'configuration-url' | 'events';

interface Props {
  currentUser: LoggedInUser | null;
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
  const showRolesTabIf =
    !integration?.archived &&
    !integration?.apiServiceAccount &&
    hasAppPermission(currentUser?.client_roles || [], appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_ROLES);
  const showEventsTabIf = hasAppPermission(
    currentUser?.client_roles || [],
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_EVENTS,
  );
  if (!integration) return null;
  const { environments = [] } = integration;

  const hasProd = environments.includes('prod');

  const hasBceid = usesBceid(integration);
  const hasBceidProd = hasBceid && hasProd && currentUser && isBceidApprover(currentUser);

  const hasGithub = usesGithub(integration);
  const hasGithubProd = hasGithub && hasProd && currentUser && isGithubApprover(currentUser);

  const hasBcServicesCard = usesBcServicesCard(integration);
  const hasBcServicesCardProd = hasBcServicesCard && hasProd && currentUser && isBcServicesCardApprover(currentUser);

  const hasSocial = usesSocial(integration);
  const hasSocialProd = hasSocial && hasProd && currentUser && isSocialApprover(currentUser);

  const hasOTP = usesOTP(integration);
  const hasOTPProd = hasOTP && hasProd && currentUser && isOTPApprover(currentUser);

  const handleBceidApproved = () => setRows();
  const handleGithubApproved = () => setRows();
  const handleBcServicesCardApproved = () => setRows();
  const handleSocialApproved = () => setRows();
  const handleOTPApproved = () => setRows();

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
        {hasSocialProd && (
          <Tab key="social-prod" tab="Social Prod">
            <SocialTabContent integration={integration} onApproved={handleSocialApproved} />
          </Tab>
        )}
        {hasOTPProd && (
          <Tab key="otp-prod" tab="OTP Prod">
            <OTPTabContent integration={integration} onApproved={handleOTPApproved} />
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
                {environments.map((env) => (
                  <Tab key={env} tab={startCase(env)}>
                    <br />
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
