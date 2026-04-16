import styled from 'styled-components';
import { Tabs } from '@bcgov-sso/common-react-components';
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
import { startCase } from 'lodash';
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

  const tabs = [
    {
      key: 'details',
      label: 'Details',
      children: (
        <TabWrapper>
          <AdminRequestPanel currentUser={currentUser} request={integration} onUpdate={setRows} />
        </TabWrapper>
      ),
    },
  ];

  if (hasBceidProd) {
    tabs.push({
      key: 'bceid-prod',
      label: 'BCeID Prod',
      children: <BceidTabContent integration={integration} onApproved={handleBceidApproved} />,
    });
  }
  if (hasGithubProd) {
    tabs.push({
      key: 'github-prod',
      label: 'GitHub Prod',
      children: <GithubTabContent integration={integration} onApproved={handleGithubApproved} />,
    });
  }
  if (hasBcServicesCardProd) {
    tabs.push({
      key: 'bcsc-prod',
      label: 'BC Services Card Prod',
      children: <BcServicesCardTabContent integration={integration} onApproved={handleBcServicesCardApproved} />,
    });
  }
  if (hasSocialProd) {
    tabs.push({
      key: 'social-prod',
      label: 'Social Prod',
      children: <SocialTabContent integration={integration} onApproved={handleSocialApproved} />,
    });
  }
  if (hasOTPProd) {
    tabs.push({
      key: 'otp-prod',
      label: 'OTP Prod',
      children: <OTPTabContent integration={integration} onApproved={handleOTPApproved} />,
    });
  }
  if (showEventsTabIf) {
    tabs.push({
      key: 'events',
      label: 'Events',
      children: (
        <TabWrapper>
          <AdminEventPanel requestId={integration.id} />
        </TabWrapper>
      ),
    });
  }
  if (showRolesTabIf) {
    const subTabs = environments.map((env) => {
      return {
        key: env,
        label: startCase(env),
        children: (
          <>
            <br />
            <RoleEnvironment environment={env} integration={integration} viewOnly={true} />
          </>
        ),
      };
    });
    tabs.push({
      key: 'roles',
      label: 'Roles',
      children: (
        <TabWrapper>
          <Tabs items={subTabs} activeKey={environment} onChange={setEnvironment} tabBarGutter={30} />
        </TabWrapper>
      ),
    });
  }

  return (
    <div>
      <Tabs
        tabPosition="top"
        activeKey={activeKey}
        onChange={(k: any) => setActiveKey(k)}
        tabBarGutter={30}
        items={tabs}
      />
    </div>
  );
}

export default AdminTabs;
