import styled from 'styled-components';
import { Tabs, Tab } from '@bcgov-sso/common-react-components';
import { Integration } from 'interfaces/Request';
import { usesBceid, usesGithub, usesVerifiedCredential } from '@app/helpers/integration';
import AdminRequestPanel from 'page-partials/admin-dashboard/AdminRequestPanel';
import AdminEventPanel from 'page-partials/admin-dashboard/AdminEventPanel';
import { LoggedInUser } from 'interfaces/team';
import BceidTabContent from './BceidTabContent';
import GithubTabContent from './GithubTabContent';
import VerifiedCredentialTabContent from './VerifiedCredentialTabContent';

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

  const hasVerifiedCredential = usesVerifiedCredential(integration);
  const hasVerifiedCredentialProd = hasVerifiedCredential && hasProd;

  const handleBceidApproved = () => setRows();
  const handleGithubApproved = () => setRows();
  const handleVerifiedCredentialApproved = () => setRows();

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
        {hasVerifiedCredentialProd && (
          <Tab key="vc-prod" tab="Verified Credential Prod">
            <VerifiedCredentialTabContent integration={integration} onApproved={handleVerifiedCredentialApproved} />
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
