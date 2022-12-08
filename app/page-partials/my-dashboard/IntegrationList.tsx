import React, { useContext, useState, useEffect, Dispatch, SetStateAction } from 'react';
import Link from '@button-inc/bcgov-theme/Link';
import { Integration } from 'interfaces/Request';
import padStart from 'lodash.padstart';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Table, Button, NumberedContents, Header } from '@bcgov-sso/common-react-components';
import { getStatusDisplayName } from 'utils/status';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faCheck } from '@fortawesome/free-solid-svg-icons';
import PageLoader from 'components/PageLoader';
import ActionButtons, { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import { getRequests, deleteRequest } from 'services/request';
import { hasAnyPendingStatus } from 'utils/helpers';
import { authTypeDisplay } from 'metadata/display';
import { SystemUnavailableMessage, NoEntitiesMessage } from './Messages';

const RightAlignHeader = styled.th`
  text-align: right;
  min-width: 100px;
`;

const RightFloatButtons = styled.td`
  float: right;
  margin-top: 10px;
`;

const PNoMargin = styled.p`
  margin: 0;
`;

const NewEntityButton = ({
  handleNewIntegrationClick,
  integrations,
}: {
  handleNewIntegrationClick: Function;
  integrations?: Integration[];
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
          <Button size="medium" onClick={handleNewIntegrationClick} variant="callout">
            + Request SSO Integration
          </Button>
        </div>
      </>
    );
  } else {
    return (
      <Button size="medium" onClick={handleNewIntegrationClick} variant="callout">
        + Request SSO Integration
      </Button>
    );
  }
};

interface Props {
  setIntegration: Function;
  setIntegrationCount: (integrations: number) => void;
}

export default function IntegrationList({ setIntegration, setIntegrationCount }: Props) {
  const router = useRouter();
  let { integr } = router.query;

  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeIntegrationId, setActiveIntegrationId] = useState<number | undefined>(
    (integr && Number(integr)) || undefined,
  );
  const handleNewIntegrationClick = async () => {
    router.push('/request');
  };

  const updateActiveIntegration = (integration: Integration) => {
    setActiveIntegrationId(integration.id);
    setIntegration(integration);
  };

  const updateIntegrations = (integrations: Integration[]) => {
    const ints = integrations || [];
    setIntegrations(ints);
    setIntegrationCount(ints.length);
    if (activeIntegrationId) {
      const integration = integrations.find((integration) => integration?.id === activeIntegrationId);
      if (integration) updateActiveIntegration(integration);
      else if (integrations?.length > 0) updateActiveIntegration(integrations[0]);
    } else if (integrations?.length > 0) updateActiveIntegration(integrations[0]);
  };

  const loadIntegrations = async () => {
    setLoading(true);
    console.log('-------loading-1------', loading);
    const [integrations, err] = await getRequests();
    setHasError(!!err);
    updateIntegrations(integrations || []);
    setLoading(false);
    console.log('-------loading-2------', loading);
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
    if (hasError) return <SystemUnavailableMessage />;

    if (!integrations || integrations.length === 0) return <NoEntitiesMessage message="No Requests Submitted" />;

    return (
      <>
        <Header size="lg">INTEGRATIONS</Header>
        <Table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Project Name</th>
              <th>Status</th>
              <th>Usecase</th>
              <th>Service Type</th>
              <RightAlignHeader>Actions</RightAlignHeader>
            </tr>
          </thead>
          <tbody>
            {integrations?.map((integration: Integration) => (
              <tr
                className={activeIntegrationId === integration.id ? 'active' : ''}
                key={integration.id}
                onClick={() => updateActiveIntegration(integration)}
              >
                <td>{padStart(String(integration.id), 8, '0')}</td>
                <td>{integration.projectName}</td>
                <td>{getStatusDisplayName(integration.status || 'draft')}</td>
                <td>{authTypeDisplay[integration.authType || 'browser-login']}</td>
                <td>{integration.serviceType === 'gold' ? 'Gold' : 'Silver'}</td>
                <RightFloatButtons>
                  <ActionButtons
                    request={integration}
                    onDelete={() => {
                      loadIntegrations();
                    }}
                    defaultActiveColor="#fff"
                    delIconStyle={{ marginLeft: '7px' }}
                  />
                </RightFloatButtons>
              </tr>
            ))}
          </tbody>
        </Table>
      </>
    );
  };

  const content = getTableContents();
  console.log('-------loading-3------', loading);
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
