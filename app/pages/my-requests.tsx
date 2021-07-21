import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import Grid from '@button-inc/bcgov-theme/Grid';
import Button from '@button-inc/bcgov-theme/Button';
import { get, padStart } from 'lodash';
import styled from 'styled-components';
import { getRequests } from 'services/request';
import { getInstallation } from 'services/keycloak';
import { ClientRequest } from 'interfaces/Request';
import providerSchema from 'schemas/providers';
import Table from 'components/Table';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import ActionButtons from 'components/ActionButtons';
import reducer from 'reducers/requestReducer';
import RequestInfoTabs from 'components/RequestInfoTabs';
import { getStatusDisplayName } from 'utils/status';
import { $setRequests, $setRequest } from 'dispatchers/requestDispatcher';
import { PageProps } from 'interfaces/props';

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
  font-size: 1.2em;
  font-weight: 600;
`;

const NavTabs = styled.ul`
  & > li {
    margin-bottom: 0 !important;
  }
`;

interface RowProps {
  active: boolean;
}

const SelectableRow = styled.tr`
  background-color: ${(props: RowProps) => (props.active ? '#ffed9f' : '#f8f8f8')};
`;

export const RequestsContext = React.createContext({} as any);

function RequestsPage({ currentUser }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [state, dispatch] = useReducer(reducer, {});
  const { requests = {}, selectedRequest } = state;

  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state, dispatch]);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const data = (await getRequests()) || {};
      dispatch($setRequests(data));
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

  return (
    <ResponsiveContainer rules={mediaRules}>
      <Button variant="primary-inverse" size="small" onClick={handleNewClick}>
        + Create New...
      </Button>

      <br />
      <br />
      <RequestsContext.Provider value={contextValue}>
        <Grid cols={selectedRequest ? 2 : 1} gutter={[5, 2]}>
          <Grid.Row collapse="800">
            <Grid.Col>
              <Title>My Project List</Title>
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
                  {requests.length > 0 ? (
                    requests.map((request: ClientRequest) => {
                      return (
                        <SelectableRow
                          active={selectedRequest?.id === request.id}
                          key={request.id}
                          onClick={() => handleSelection(request)}
                        >
                          <td>{padStart(String(request.id), 8, '0')}</td>
                          <td>{request.projectName}</td>
                          <td>{getStatusDisplayName(request.status || 'draft')}</td>
                          <td>
                            <ActionButtons request={request} />
                          </td>
                        </SelectableRow>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10}>No requests found</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Grid.Col>
            {selectedRequest && (
              <Grid.Col>
                <RequestInfoTabs />
              </Grid.Col>
            )}
          </Grid.Row>
        </Grid>
      </RequestsContext.Provider>
    </ResponsiveContainer>
  );
}

export default RequestsPage;
