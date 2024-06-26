import styled from 'styled-components';
import { Tabs, Tab } from '@bcgov-sso/common-react-components';
import { Integration } from 'interfaces/Request';
import { usesBceid, usesGithub, usesDigitalCredential, usesBcServicesCard } from '@app/helpers/integration';
import AdminRequestPanel from 'page-partials/admin-dashboard/AdminRequestPanel';
import AdminEventPanel from 'page-partials/admin-dashboard/AdminEventPanel';
import { LoggedInUser } from 'interfaces/team';
import BceidTabContent from './BceidTabContent';
import GithubTabContent from './GithubTabContent';
import DigitalCredentialTabContent from './DigitalCredentialTabContent';
import BcServicesCardTabContent from './BcServicesCardTabContent';

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
  if (!integration) return null;
  const { environments = [] } = integration;
  const hasProd = environments.includes('prod');

  const hasBceid = usesBceid(integration);
  const hasBceidProd = hasBceid && hasProd;

  const hasGithub = usesGithub(integration);
  const hasGithubProd = hasGithub && hasProd;

  const hasDigitalCredential = usesDigitalCredential(integration);
  const hasDigitalCredentialProd = hasDigitalCredential && hasProd;

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
        {hasDigitalCredentialProd && (
          <Tab key="vc-prod" tab="Digital Credential Prod">
            <DigitalCredentialTabContent integration={integration} onApproved={handleDigitCredentialApproved} />
          </Tab>
        )}
        {hasBcServicesCardProd && (
          <Tab key="bcsc-prod" tab="BC Services Card Prod">
            <BcServicesCardTabContent integration={integration} onApproved={handleBcServicesCardApproved} />
          </Tab>
        )}

        <Tab key="events" tab="Events">
          <TabWrapper>
            <AdminEventPanel requestId={integration.id} />
          </TabWrapper>
        </Tab>
      </Tabs>
    </>
  );
}

export default AdminTabs;
