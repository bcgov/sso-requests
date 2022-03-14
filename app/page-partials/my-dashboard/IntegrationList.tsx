import React, { useContext, useState, useEffect, Dispatch, SetStateAction } from 'react';
import Link from '@button-inc/bcgov-theme/Link';
import { Request } from 'interfaces/Request';
import { padStart } from 'lodash';
import Grid from '@button-inc/bcgov-theme/Grid';
import Table from 'html-components/Table';
import { getStatusDisplayName } from 'utils/status';
import styled from 'styled-components';
import { $setDownloadError } from 'dispatchers/requestDispatcher';
import { Button, NumberedContents } from '@bcgov-sso/common-react-components';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faExclamationCircle, faTrash, faEdit, faCheck } from '@fortawesome/free-solid-svg-icons';
import PageLoader from 'components/PageLoader';
import ActionButtons, { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import { getRequests, deleteRequest } from 'services/request';
import { hasAnyPendingStatus } from 'utils/helpers';
import { DashboardReducerState } from 'reducers/dashboardReducer';

const CenteredHeader = styled.th`
  text-align: center;
  min-width: 100px;
`;

const PNoMargin = styled.p`
  margin: 0;
`;

const NotAvailable = styled.div`
  color: #a12622;
  height: 60px;
  padding-left: 20px;
  padding-top: 16px;
  padding-bottom: 22px;
  weight: 700;
  background-color: #f2dede;
`;

const NoProjects = styled.div`
  color: #006fc4;
  height: 60px;
  padding-left: 20px;
  padding-top: 16px;
  padding-bottom: 22px;
  weight: 700;
  background-color: #f8f8f8;
`;

const SystemUnavailableMessage = (
  <NotAvailable>
    <FontAwesomeIcon icon={faExclamationCircle} title="Unavailable" />
    &nbsp; The system is unavailable at this moment. please refresh the page.
  </NotAvailable>
);

const NoEntitiesMessage = ({ message }: { message: string }) => (
  <NoProjects>
    <FontAwesomeIcon icon={faInfoCircle} title="Information" />
    &nbsp; {message}
  </NoProjects>
);

const NewEntityButton = ({
  handleNewIntegrationClick,
  integrations,
}: {
  handleNewIntegrationClick: Function;
  integrations?: Request[];
}) => {
  if (!integrations || integrations?.length == 0) {
    return (
      <>
        <p>
          <b>To request an integration for a Standard Realm, you’ll need the following information:</b>
        </p>
        <div style={{ background: '#D9EDFD', textAlign: 'center', padding: '16px' }}>
          <Grid cols={2} style={{ textAlign: 'left' }}>
            <Grid.Row collapse="992" gutter={[]} align="top">
              <Grid.Col span={1}>
                <NumberedContents number={1} title="Project Information" children={null} />
                <PNoMargin>
                  <FontAwesomeIcon icon={faCheck} /> Project Name
                </PNoMargin>
                <PNoMargin>
                  <FontAwesomeIcon icon={faCheck} /> Project Team Members (Optional)
                </PNoMargin>
                <PNoMargin>
                  <FontAwesomeIcon icon={faCheck} /> Product Owner or Technical Contact
                </PNoMargin>
              </Grid.Col>
              <Grid.Col span={1}>
                <NumberedContents number={2} title="Technical Info" children={null} />
                <PNoMargin>
                  <FontAwesomeIcon icon={faCheck} /> Client type (
                  <Link href="https://github.com/bcgov/sso-keycloak/wiki/Using-Your-SSO-Client#confidential-vs-private-client">
                    Public or Confidential, learn more
                  </Link>
                  )
                </PNoMargin>
                <PNoMargin>
                  <FontAwesomeIcon icon={faCheck} /> Identity Provider (IDIR, Azure, BCeID or Basic)
                </PNoMargin>
                <PNoMargin>
                  <FontAwesomeIcon icon={faCheck} /> Environments (Development, Test, Production)
                </PNoMargin>
                <PNoMargin>
                  <FontAwesomeIcon icon={faCheck} /> Redirect URIs for selected environments
                </PNoMargin>
              </Grid.Col>
            </Grid.Row>
            <p style={{ marginTop: '1.25rem' }}>
              *You’ll be able to save and return your integration request, anytime throughout the request form.
            </p>
          </Grid>
          <Button size="large" onClick={handleNewIntegrationClick} variant="callout">
            + Request SSO Integration
          </Button>
        </div>
      </>
    );
  } else {
    return (
      <Button size="large" onClick={handleNewIntegrationClick} variant="callout">
        + Request SSO Integration
      </Button>
    );
  }
};

interface Props {
  setIntegration: Function;
  state: DashboardReducerState;
  dispatch: Dispatch<SetStateAction<any>>;
}

export default function IntegrationList({ setIntegration, state, dispatch }: Props) {
  const router = useRouter();
  let { integr } = router.query;

  const [loading, setLoading] = useState<boolean>(true);
  const [integrations, setIntegrations] = useState<Request[]>([]);
  const [activeIntegration, setActiveIntegration] = useState<Request | null>(null);
  const [activeIntegrationId, setActiveIntegrationId] = useState<number | undefined>(
    (integr && Number(integr)) || undefined,
  );
  const { downloadError } = state;

  const handleNewIntegrationClick = async () => {
    router.push('/request');
  };

  const updateActiveIntegration = (integration: Request) => {
    setActiveIntegration(integration);
    setActiveIntegrationId(integration.id);
    setIntegration(integration);
  };

  const updateIntegrations = (integrations: Request[]) => {
    setIntegrations(integrations || []);
    if (activeIntegrationId) {
      const integration = integrations.find((integration) => integration?.id === activeIntegrationId);
      if (integration) updateActiveIntegration(integration);
      else if (integrations?.length > 0) updateActiveIntegration(integrations[0]);
    } else if (integrations?.length > 0) updateActiveIntegration(integrations[0]);
  };

  const loadIntegrations = async () => {
    setLoading(true);
    const [integrations, err] = await getRequests();
    if (err) dispatch($setDownloadError(true));
    else updateIntegrations(integrations || []);
    setLoading(false);
  };

  useEffect(() => {
    loadIntegrations();
    router.replace('/my-dashboard/integrations');
  }, []);

  let interval: any;

  useEffect(() => {
    if (hasAnyPendingStatus(integrations || [])) {
      clearInterval(interval);

      interval = setInterval(async () => {
        const [data, err] = await getRequests();

        if (err) {
          clearInterval(interval);
        } else {
          updateIntegrations(data || []);
        }
      }, 1000 * 5);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [integrations, activeIntegrationId]);

  const getTableContents = () => {
    if (downloadError) return SystemUnavailableMessage;

    if (!integrations || integrations.length === 0) return <NoEntitiesMessage message="No Requests Submitted" />;

    return (
      <Table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>Project Name</th>
            <th>Status</th>
            <CenteredHeader>Actions</CenteredHeader>
          </tr>
        </thead>
        <tbody>
          {integrations?.map((integration: Request) => (
            <tr
              className={activeIntegrationId === integration.id ? 'active' : ''}
              key={integration.id}
              onClick={() => updateActiveIntegration(integration)}
            >
              <td>{padStart(String(integration.id), 8, '0')}</td>
              <td>{integration.projectName}</td>
              <td>{getStatusDisplayName(integration.status || 'draft')}</td>
              <td>
                <ActionButtons
                  request={integration}
                  onDelete={() => {
                    loadIntegrations();
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const content = getTableContents();
  if (loading) return <PageLoader />;

  return (
    <>
      <br />
      <NewEntityButton handleNewIntegrationClick={handleNewIntegrationClick} integrations={integrations} />
      <br />
      <br />
      {content}
    </>
  );
}
