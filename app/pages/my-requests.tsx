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
  currentId: number;
  selectedId: number | null;
}

const SelectableRow = styled.tr`
  background-color: ${(props: RowProps) => (props.currentId === props.selectedId ? '#ffed9f' : '#f8f8f8')};
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
  const { requests = {}, requestId, env } = state;

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

  const handleSelection = async (id: number) => {
    if (requestId === id) return;
    try {
      dispatch({ type: 'setRequestId', payload: id });
      dispatch({ type: 'loadInstallation' });
      dispatch({ type: 'setEnvironment', payload: env || 'dev' });
      const installation = await getInstallation(id);
      dispatch({ type: 'setInstallation', payload: installation });
    } catch (err) {
      dispatch({ type: 'setInstallation', payload: {} });
    }
  };

  const handleNewClick = async () => {
    router.push('/request');
  };

  if (loading) return 'loading...';

  return (
    <ResponsiveContainer rules={mediaRules}>
      <Button variant="primary-inverse" size="small" onClick={handleNewClick}>
        + Create New...
      </Button>

      <br />
      <br />

      <Grid cols={2} gutter={[5, 2]}>
        <RequestsContext.Provider value={contextValue}>
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
                          currentId={request.id}
                          selectedId={requestId}
                          key={request.id}
                          onClick={() => handleSelection(request.id)}
                        >
                          <td>{request.id}</td>
                          <td>{request.projectName}</td>
                          <td>{request.status}</td>
                          <td>
                            <ActionButtons currentId={request.id} />
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
            <Grid.Col>{requestId && <RequestInfoTabs />}</Grid.Col>
          </Grid.Row>
        </RequestsContext.Provider>
      </Grid>
    </ResponsiveContainer>
  );
}

export default RequestsPage;
