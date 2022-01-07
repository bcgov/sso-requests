import React, { useContext } from 'react';
import { RequestTabs } from 'components/RequestTabs';
import Tab from 'react-bootstrap/Tab';
import { Request } from 'interfaces/Request';
import { padStart } from 'lodash';
import Table from 'html-components/Table';
import { RequestsContext } from 'pages/my-requests';
import { getStatusDisplayName } from 'utils/status';
import styled from 'styled-components';
import { $setEditingRequest, $setActiveRequestId, $setTableTab, $setActiveTeamId } from 'dispatchers/requestDispatcher';
import { Button } from '@bcgov-sso/common-react-components';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faExclamationCircle, faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { Team } from 'interfaces/team';
import ActionButtons, { ActionButton } from 'components/ActionButtons';

const CenteredHeader = styled.th`
  text-align: center;
  min-width: 100px;
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

const ActionButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
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

export default function ProjectTeamTabs() {
  const router = useRouter();
  const { state, dispatch } = useContext(RequestsContext);
  const { requests, teams, activeRequestId, tableTab, downloadError, activeTeamId } = state;

  const hasArchivedRequest = requests && requests.find((request) => request.archived);
  const selectedRequest = requests?.find((request) => request.id === activeRequestId);
  const selectedTeam = teams?.find((team) => team.id === activeTeamId);

  const handleProjectSelection = async (request: Request) => {
    console.log(request.id, activeRequestId);
    if (activeRequestId === request.id) return;
    dispatch($setActiveRequestId(request.id));
    dispatch($setEditingRequest(false));
  };

  const handleTeamSelection = async (team: Team) => dispatch($setActiveTeamId(team?.id));

  const handleNewClick = async () => {
    router.push('/request');
  };

  const getTableContents = (tableTab?: string) => {
    const viewArchived = tableTab === 'archivedProjects';
    if (downloadError) return SystemUnavailableMessage;
    if (tableTab === 'activeProjects' && requests?.length === 0)
      return <NoEntitiesMessage message="No Requests Submitted" />;
    if (tableTab === 'activeProjects' || tableTab === 'archivedProjects')
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
            {requests
              ?.filter((request: Request) => viewArchived === request.archived)
              .map((request: Request) => {
                return (
                  <tr
                    className={selectedRequest?.id === request.id ? 'active' : ''}
                    key={request.id}
                    onClick={() => handleProjectSelection(request)}
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
    if (tableTab === 'activeTeams' && teams?.length === 0)
      return <NoEntitiesMessage message="You don't belong to a team" />;
    else
      return (
        <Table>
          <thead>
            <tr>
              <th>Team Name</th>
              <CenteredHeader>Actions</CenteredHeader>
            </tr>
          </thead>
          <tbody>
            {teams &&
              teams.map((team: Team) => {
                return (
                  <tr
                    className={selectedTeam?.id === team.id ? 'active' : ''}
                    key={team.name}
                    onClick={() => handleTeamSelection(team)}
                  >
                    <td>{team.name}</td>
                    <td>
                      <ActionButtonContainer style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <ActionButton icon={faEdit} role="button" aria-label="edit" title="Edit" size="lg" />
                        <div style={{ width: '20px' }} />
                        <ActionButton icon={faTrash} role="button" aria-label="edit" title="Edit" size="lg" />
                      </ActionButtonContainer>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      );
  };

  const content = getTableContents(tableTab);
  return (
    <>
      <RequestTabs onSelect={(key: string) => dispatch($setTableTab(key))}>
        <Tab eventKey="activeProjects" title="My Projects" />
        {hasArchivedRequest && <Tab eventKey="archivedProjects" title="Archived" />}
        <Tab eventKey="activeTeams" title="My Teams" />
      </RequestTabs>
      <br />
      <Button size="large" onClick={handleNewClick} variant="callout">
        + Request Integration
      </Button>
      <br />
      <br />
      {content}
    </>
  );
}
