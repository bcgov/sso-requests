import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faInfoCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import { get, padStart } from 'lodash';
import styled from 'styled-components';
import { getRequests } from 'services/request';
import { ClientRequest } from 'interfaces/Request';
import providerSchema from 'schemas/providers';
import Table from 'html-components/Table';
import Button from 'html-components/Button';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import ActionButtons from 'components/ActionButtons';
import reducer from 'reducers/requestReducer';
import RequestInfoTabs from 'components/RequestInfoTabs';
import { getStatusDisplayName } from 'utils/status';
import { $setRequests, $setRequest } from 'dispatchers/requestDispatcher';
import { PageProps } from 'interfaces/props';
import Alert from '@button-inc/bcgov-theme/Alert';
import FadingAlert from 'html-components/FadingAlert';

const mediaRules: MediaRule[] = [
  {
    maxWidth: 1000,
    marginTop: 10,
  },
  {
    maxWidth: 1199,
    width: 933,
    marginTop: 20,
  },
  {
    maxWidth: 1440,
    width: 1127,
    marginTop: 20,
  },
  {
    width: 1400,
    marginTop: 20,
  },
];

const Title = styled.div`
  color: #777777;
  font-size: 16px;
  font-weight: 600;
  height: 30px;
  border-bottom: 1px solid #707070;
  margin-bottom: 5px;
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

const BottomAlertWrapper = styled.div`
  position: fixed !important;
  bottom: 0;
  left: 0;
  width: 100vw;

  & .pg-notification-close {
    padding: 0 1rem;
  }
`;

export const RequestsContext = React.createContext({} as any);

function RequestsPage({ currentUser }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [state, dispatch] = useReducer(reducer, {});
  const { requests = [], selectedRequest } = state;

  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state, dispatch]);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);

      const [data, err] = await getRequests();
      if (err) {
        setHasError(true);
      } else {
        const requests = data || [];
        dispatch($setRequests(requests));

        const { id } = router.query;
        if (id) {
          dispatch($setRequest(requests.find((request) => request.id === Number(id))));
        }
      }

      setLoading(false);
    };
    getData();
  }, []);

  const handleSelection = async (request: ClientRequest) => {
    if (selectedRequest?.id === request.id) return;
    dispatch($setRequest(request));
  };

  const handleNewClick = async () => {
    router.push('/request');
  };

  if (loading) return 'Loading...';

  let content = null;
  if (hasError) {
    content = (
      <NotAvailable>
        <FontAwesomeIcon icon={faExclamationCircle} />
        &nbsp; The system is unavailable at this moment. please refresh the page.
      </NotAvailable>
    );
  } else if (requests.length === 0) {
    content = (
      <NoProjects>
        <FontAwesomeIcon icon={faInfoCircle} />
        &nbsp; No SSO project requests submitted
      </NoProjects>
    );
  } else {
    content = (
      <Table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>Project Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request: ClientRequest) => {
            return (
              <tr
                className={selectedRequest?.id === request.id ? 'active' : ''}
                key={request.id}
                onClick={() => handleSelection(request)}
              >
                <td>{padStart(String(request.id), 8, '0')}</td>
                <td>{request.projectName}</td>
                <td>{getStatusDisplayName(request.status || 'draft')}</td>
                <td>
                  <ActionButtons request={request} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }

  return (
    <ResponsiveContainer rules={mediaRules}>
      <Button size="small" onClick={handleNewClick}>
        + Request Project
      </Button>

      <br />
      <br />
      <RequestsContext.Provider value={contextValue}>
        <Grid cols={2} gutter={[5, 2]}>
          <Grid.Row collapse="800">
            <Grid.Col>
              <Title>My Project Dashboard</Title>
              {content}
            </Grid.Col>
            {selectedRequest && (
              <Grid.Col>
                <RequestInfoTabs />
              </Grid.Col>
            )}
          </Grid.Row>
        </Grid>
      </RequestsContext.Provider>
      {router.query.id && (
        <BottomAlertWrapper>
          <FadingAlert
            variant="success"
            fadeOut={10000}
            closable
            content={`Request ID:${padStart(String(router.query.id), 8, '0')} is successfully submitted!`}
          />
        </BottomAlertWrapper>
      )}
    </ResponsiveContainer>
  );
}

export default RequestsPage;
