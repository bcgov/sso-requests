import React, { useState, useEffect } from 'react';
import Link from '@button-inc/bcgov-theme/Link';
import { Integration } from 'interfaces/Request';
import padStart from 'lodash.padstart';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Button, NumberedContents, Header } from '@bcgov-sso/common-react-components';
import Table from 'components/TableNew';
import { getStatusDisplayName } from 'utils/status';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import PageLoader from 'components/PageLoader';
import ActionButtons from 'components/ActionButtons';
import { getRequests } from 'services/request';
import { hasAnyPendingStatus } from 'utils/helpers';
import { authTypeDisplay } from 'metadata/display';
import { SystemUnavailableMessage, NoEntitiesMessage } from './Messages';
import { formatWikiURL } from 'utils/constants';
import { AxiosError } from 'axios';
import { TopAlert, withTopAlert } from '@app/layout/TopAlert';

const RightFloatButtons = styled.tr`
  float: right;
  padding-right: 0.5em;
`;

const PNoMargin = styled.p`
  margin: 0;
`;

function IntegrationListActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '1em' }}>Actions</span>;
}

const formatIntegrationID = (id: number) => padStart(String(id), 8, '0');

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
                  <Link href={formatWikiURL('Useful-References#client')}>Public or Confidential, learn more</Link>)
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
          <Button size="medium" data-testid="request-integration" onClick={handleNewIntegrationClick} variant="callout">
            + Request SSO Integration
          </Button>
        </div>
      </>
    );
  } else {
    return (
      <Button size="medium" data-testid="request-integration" onClick={handleNewIntegrationClick} variant="callout">
        + Request SSO Integration
      </Button>
    );
  }
};

interface Props {
  setIntegration: Function;
  setIntegrationCount: (integrations: number) => void;
  alert: TopAlert;
}

function IntegrationList({ setIntegration, setIntegrationCount, alert }: Readonly<Props>) {
  const router = useRouter();
  let { integr } = router.query;

  const [loading, setLoading] = useState<boolean>(true);
  const [hasIntegrationLoadError, setHasIntegrationLoadError] = useState<boolean>(false);
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
    const [integrations, err] = await getRequests();
    setHasIntegrationLoadError(!!err);
    updateIntegrations(integrations || []);
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

  const activateRow = (request: any) => {
    const integrationId = request['cells'][0].value;
    integrations.forEach((integration) => {
      if (integration.id == integrationId) updateActiveIntegration(integration);
    });
  };

  const getTableContents = () => {
    if (hasIntegrationLoadError) return <SystemUnavailableMessage />;

    if (!integrations || integrations.length === 0) return <NoEntitiesMessage message="No Requests Submitted" />;

    return (
      <>
        <h2>Integrations</h2>
        <Table
          headers={[
            {
              accessor: 'id',
              Header: 'Request ID',
            },
            {
              accessor: 'projectName',
              Header: 'Project Name',
            },
            {
              accessor: 'status',
              Header: 'Status',
            },
            {
              accessor: 'authType',
              Header: 'Usecase',
            },
            {
              accessor: 'serviceType',
              Header: 'Service Type',
            },
            {
              accessor: 'actions',
              Header: <IntegrationListActionsHeader />,
              disableSortBy: true,
            },
          ]}
          data={integrations?.map((integration: Integration) => {
            return {
              id: formatIntegrationID(integration.id as number),
              projectName: integration.projectName,
              status: getStatusDisplayName(integration.status || 'draft'),
              authType: authTypeDisplay[integration.authType || 'browser-login'],
              serviceType: 'Gold',
              actions: (
                <RightFloatButtons>
                  <ActionButtons
                    request={integration}
                    onDelete={(_: any, error: AxiosError | null) => {
                      if (error) {
                        alert.show({
                          variant: 'danger',
                          content: `Failed to delete integration ${integration.projectName}.`,
                        });
                      } else {
                        loadIntegrations();
                      }
                    }}
                    defaultActiveColor="#fff"
                    delIconStyle={{ marginLeft: '7px' }}
                  />
                </RightFloatButtons>
              ),
            };
          })}
          activateRow={activateRow}
          activeSelector={activeIntegrationId && formatIntegrationID(activeIntegrationId)}
          rowSelectorKey={'id'}
          colfilters={[]}
        ></Table>
      </>
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

export default withTopAlert(IntegrationList);
