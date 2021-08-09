import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faInfoCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import { get, padStart } from 'lodash';
import styled from 'styled-components';
import { getRequests } from 'services/request';
import { Request } from 'interfaces/Request';
import Table from 'html-components/Table';
import Button from 'html-components/Button';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import ActionButtons from 'components/ActionButtons';
import reducer from 'reducers/requestReducer';
import RequestInfoTabs from 'components/RequestInfoTabs';
import { getStatusDisplayName } from 'utils/status';
import { $setRequests, $setEditingRequest } from 'dispatchers/requestDispatcher';
import { PageProps } from 'interfaces/props';
import PageLoader from 'components/PageLoader';

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

// TODO: move this logic to component Grid default style
const OverflowAuto = styled.div`
  overflow: auto;
`;

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

export const RequestsContext = React.createContext({} as any);

const hasAnyPendingStatus = (requests: Request[]) => {
  return requests.some((request) => {
    return [
      // 'draft',
      'submitted',
      'pr',
      'prFailed',
      'planned',
      'planFailed',
      'approved',
      // 'applied',
      'applyFailed',
    ].includes(request.status || '');
  });
};

function RequestsPage({ currentUser }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [state, dispatch] = useReducer(reducer, {});
  const { requests = [] } = state;

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
          setSelectedId(Number(id));
        }
      }

      setLoading(false);
    };

    getData();
  }, []);

  let interval: any;

  useEffect(() => {
    if (hasAnyPendingStatus(state.requests || [])) {
      clearInterval(interval);

      interval = setInterval(async () => {
        const [data, err] = await getRequests();

        if (err) {
          clearInterval(interval);
        } else {
          let requests = data || [];
          requests.map((request, index) => {
            if (request.id === selectedId) return state.requests[index];
            return request;
          });

          if (!state.editingRequest) {
            dispatch($setRequests(requests));
          }
        }
      }, 1000 * 5);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [state.requests, state.editingRequest]);

  const handleSelection = async (request: Request) => {
    if (selectedId === request.id) return;
    setSelectedId(request?.id);
    dispatch($setEditingRequest(false));
  };

  const handleNewClick = async () => {
    router.push('/request');
  };

  if (loading) return <PageLoader />;

  const selectedRequest = requests.find((request: Request) => request.id === Number(selectedId));

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
          {requests.map((request: Request) => {
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
                  <ActionButtons request={request} selectedRequest={selectedRequest} setSelectedId={setSelectedId} />
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
        + Request Access
      </Button>

      <br />
      <br />
      <RequestsContext.Provider value={contextValue}>
        <Grid cols={2}>
          <Grid.Row collapse="800" gutter={[15, 2]}>
            <Grid.Col>
              <OverflowAuto>
                <Title>My Dashboard</Title>
                {content}
              </OverflowAuto>
            </Grid.Col>
            {selectedRequest && (
              <Grid.Col>
                <RequestInfoTabs key={selectedRequest.id + selectedRequest.status} selectedRequest={selectedRequest} />
              </Grid.Col>
            )}
          </Grid.Row>
        </Grid>
      </RequestsContext.Provider>
    </ResponsiveContainer>
  );
}

export default RequestsPage;
