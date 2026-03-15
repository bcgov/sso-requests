import { useState, useEffect, MouseEventHandler } from 'react';
import Link from '@button-inc/bcgov-theme/Link';
import { Integration } from 'interfaces/Request';
import { padStart } from 'lodash';
import Grid from '@button-inc/bcgov-theme/Grid';
import { NumberedContents } from '@bcgov-sso/common-react-components';
import { Table } from '@bcgov-sso/common-react-components';
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
import TableNew from '@app/components/TableNew';

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

const unformatIntegrationID = (formattedId: string | number): number => {
  const normalized = String(formattedId).replace(/^0+/, '');
  return Number(normalized || '0');
};

const NewEntityButton = ({
  handleNewIntegrationClick,
  integrations,
}: {
  handleNewIntegrationClick: MouseEventHandler<HTMLButtonElement>;
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
          <button data-testid="request-integration" onClick={handleNewIntegrationClick} className="callout">
            + Request SSO Integration
          </button>
        </div>
      </>
    );
  } else {
    return (
      <button data-testid="request-integration" onClick={handleNewIntegrationClick} className="callout">
        + Request SSO Integration
      </button>
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

  const activateRow = (row: any) => {
    const integrationId = row.id;
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
        <TableNew
          dataTestId="integration-list-table"
          columns={
            [
              {
                accessorKey: 'id',
                header: 'Request ID',
              },
              {
                accessorKey: 'projectName',
                header: 'Project Name',
              },
              {
                accessorKey: 'status',
                header: 'Status',
              },
              {
                accessorKey: 'authType',
                header: 'Usecase',
              },
              {
                accessorKey: 'serviceType',
                header: 'Service Type',
              },
              {
                accessorKey: 'actions',
                header: () => <div style={{ display: 'flex', justifyContent: 'right', marginRight: 20 }}>Actions</div>,

                cell: (props: any) => {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'right', columnGap: '0.5rem' }}>
                      <ActionButtons
                        request={{
                          id: unformatIntegrationID(props.row.original.id),
                          status: props.row.original.originalStatus,
                          projectName: props.row.original.projectName,
                          apiServiceAccount: props.row.original.apiServiceAccount,
                          archived: props.row.original.archived,
                        }}
                        onDelete={(_: any, error: AxiosError | null) => {
                          if (error) {
                            alert.show({
                              variant: 'danger',
                              content: `Failed to delete integration ${props.row.original.projectName}.`,
                            });
                          } else {
                            loadIntegrations();
                          }
                        }}
                        defaultActiveColor="#fff"
                        delIconStyle={{ marginLeft: '7px' }}
                      />
                    </div>
                  );
                },
              },
            ] as any
          }
          data={integrations?.map((integration: Integration) => {
            return {
              id: formatIntegrationID(integration.id as number),
              projectName: integration.projectName,
              status: getStatusDisplayName(integration.status || 'draft'),
              authType: authTypeDisplay[integration.authType || 'browser-login'],
              serviceType: 'Gold',
              originalStatus: integration.status,
              apiServiceAccount: integration.apiServiceAccount,
              archived: integration.archived,
            };
          })}
          enableGlobalSearch={false}
          onRowSelect={activateRow}
          enablePagination={false}
        ></TableNew>
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
