import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import Grid from '@button-inc/bcgov-theme/Grid';
import Button from '@button-inc/bcgov-theme/Button';
import { get, findIndex } from 'lodash';
import styled from 'styled-components';
import { getRequests } from 'services/request';
import { getInstallation } from 'services/keycloak';
import { Request } from 'interfaces/Request';
import providerSchema from 'schemas/providers';
import Table from 'components/Table';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import ActionButtons from 'components/ActionButtons';
import reducer from 'reducers/requestReducer';
import RequestInfoTabs from 'components/RequestInfoTabs';

const mediaRules: MediaRule[] = [
  {
    maxWidth: 767,
  },
  {
    maxWidth: 991,
    width: 980,
  },
  {
    maxWidth: 1199,
    width: 1100,
  },
  {
    width: 1400,
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

const getProviders = (realm: string) => {
  const enums: string[] = get(providerSchema, 'properties?.realm.enumNames', []);
  const enumNames: string[] = get(providerSchema, 'properties?.realm.enumNames', []);
  const ind = findIndex(enums, (v) => v === realm);
  return enumNames[ind];
};

interface RowProps {
  active: boolean;
}

const SelectableRow = styled.tr`
  background-color: ${(props: RowProps) => (props.active ? '#ffed9f' : '#f8f8f8')};
`;

interface Props {
  currentUser: {
    email?: string;
  };
}

export const RequestsContext = React.createContext({} as any);

function RequestsPage({ currentUser }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [state, dispatch] = useReducer(reducer, {});
  const { requests = {}, selectedRequest, env } = state;

  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state, dispatch]);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const data = (await getRequests()) || {};
      dispatch({ type: 'setRequests', payload: data });
      setLoading(false);
    };
    getData();
  }, []);

  const handleSelection = async (request: Request) => {
    if (selectedRequest?.id === request.id) return;

    dispatch({ type: 'setRequest', payload: request });
  };

  const handleNewClick = async () => {
    router.push('/request');
  };

  if (loading) return 'loading...';

  const showRightPanel = selectedRequest && selectedRequest.status !== 'draft';

  return (
    <ResponsiveContainer rules={mediaRules}>
      <Button variant="primary-inverse" size="small" onClick={handleNewClick}>
        + Create New...
      </Button>

      <br />
      <br />
      <RequestsContext.Provider value={contextValue}>
        <Grid cols={showRightPanel ? 2 : 1} gutter={[5, 2]}>
          <Grid.Row collapse="800">
            <Grid.Col>
              <Title>My Request List</Title>
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
                    requests.map((request: Request) => {
                      return (
                        <SelectableRow
                          active={selectedRequest?.id === request.id}
                          key={request.id}
                          onClick={() => handleSelection(request)}
                        >
                          <td>{request.id}</td>
                          <td>{request.projectName}</td>
                          <td>{request.status}</td>
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
            {showRightPanel && (
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
