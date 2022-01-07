import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import Grid from '@button-inc/bcgov-theme/Grid';
import styled from 'styled-components';
import { getRequests, deleteRequest } from 'services/request';
import { getTeams } from 'services/team';
import { Request } from 'interfaces/Request';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import reducer, { DashboardReducerState, initialState } from 'reducers/dashboardReducer';
import RequestInfoTabs, { TabKey } from 'components/RequestInfoTabs';
import TeamInfoTabs from 'page-partials/my-requests/TeamInfoTabs';
import {
  $setRequests,
  $deleteRequest,
  $setDownloadError,
  $setActiveRequestId,
  $setTeams,
} from 'dispatchers/requestDispatcher';
import { PageProps } from 'interfaces/props';
import PageLoader from 'components/PageLoader';
import CenteredModal from 'components/CenteredModal';
import { hasAnyPendingStatus } from 'utils/helpers';
import ProjectTeamTabs from 'page-partials/my-requests/ProjectTeamTabs';
import { Team } from 'interfaces/team';

const mediaRules: MediaRule[] = [
  {
    maxWidth: 900,
    marginTop: 0,
    marginLeft: 10,
    marginRight: 10,
    marginUnit: 'px',
    horizontalAlign: 'none',
  },
  {
    width: 480,
    marginTop: 0,
    marginLeft: 2.5,
    marginRight: 2.5,
    marginUnit: 'rem',
    horizontalAlign: 'none',
  },
];

// TODO: move this logic to component Grid default style
const OverflowAuto = styled.div`
  overflow: auto;
`;

export const RequestsContext = React.createContext({} as { dispatch: Function; state: DashboardReducerState });

function RequestsPage({ currentUser }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [state, dispatch] = useReducer(reducer, initialState);

  const { requests = [], activeRequestId, activeTeamId, teams } = state;
  const selectedRequest = requests?.find((request: Request) => request.id === Number(activeRequestId));
  const selectedTeam = teams?.find((team: Team) => team.id === Number(activeTeamId));
  const canDelete = !['pr', 'planned', 'submitted'].includes(selectedRequest?.status || '');

  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state, dispatch]);

  const getData = async () => {
    setLoading(true);
    dispatch($setActiveRequestId());
    const [requestsResponse, teamsResponse] = await Promise.all([getRequests('all'), getTeams()]);
    const hasError = requestsResponse[1] || teamsResponse[1];
    if (hasError) {
      $setDownloadError(true);
    } else {
      const downloadedRequests = requestsResponse[0] || [];
      const downloadedTeams = teamsResponse[0] || [];
      dispatch($setRequests(downloadedRequests));
      dispatch($setTeams(downloadedTeams));
      const { id } = router.query;
      if (id) {
        $setActiveRequestId(Number(id));
      }
    }

    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    const [_deletedRequest, _err] = await deleteRequest(activeRequestId);
    dispatch($deleteRequest(activeRequestId || null));
    getData();
    window.location.hash = '#';
  };

  useEffect(() => {
    getData();
  }, []);

  let interval: any;

  useEffect(() => {
    if (hasAnyPendingStatus(state.requests || [])) {
      clearInterval(interval);

      interval = setInterval(async () => {
        const [data, err] = await getRequests('all');

        if (err) {
          clearInterval(interval);
        } else {
          let downloadedRequests = data || [];
          if (!state.editingRequest) {
            dispatch($setRequests(downloadedRequests));
          }
        }
      }, 1000 * 5);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [state.requests, state.editingRequest]);

  if (loading) return <PageLoader />;

  return (
    <ResponsiveContainer rules={mediaRules}>
      <RequestsContext.Provider value={contextValue}>
        <Grid cols={10}>
          <Grid.Row collapse="1100" gutter={[15, 2]}>
            <Grid.Col span={6}>
              <OverflowAuto>
                <ProjectTeamTabs />
              </OverflowAuto>
            </Grid.Col>
            {selectedRequest && (
              <Grid.Col span={4}>
                <RequestInfoTabs />
              </Grid.Col>
            )}
            {selectedTeam && (
              <Grid.Col span={4}>
                <TeamInfoTabs />
              </Grid.Col>
            )}
          </Grid.Row>
        </Grid>
        <CenteredModal
          id={'delete-modal'}
          content="You are about to delete this integration request. This action cannot be undone."
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          confirmText="Delete"
        />
      </RequestsContext.Provider>
    </ResponsiveContainer>
  );
}

export default RequestsPage;
