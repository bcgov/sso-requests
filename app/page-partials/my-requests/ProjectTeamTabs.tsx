import React, { useContext, useEffect } from 'react';
import { RequestTabs } from 'components/RequestTabs';
import Tab from 'react-bootstrap/Tab';
import { Request } from 'interfaces/Request';
import { padStart } from 'lodash';
import Table from 'html-components/Table';
import { RequestsContext } from 'pages/my-requests';
import { getStatusDisplayName } from 'utils/status';
import styled from 'styled-components';
import {
  $setActiveRequestId,
  $setTableTab,
  $setActiveTeamId,
  $setTeams,
  $setDownloadError,
  $setTeamIdToDelete,
  $setTeamIdToEdit,
} from 'dispatchers/requestDispatcher';
import { Button } from '@bcgov-sso/common-react-components';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faExclamationCircle, faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { Team } from 'interfaces/team';
import ActionButtons, { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import { getTeams, deleteTeam } from 'services/team';
import TeamForm from 'form-components/team-form/CreateTeamForm';
import EditTeamNameForm from 'form-components/team-form/EditTeamNameForm';
import CenteredModal from 'components/CenteredModal';
import { createTeamModalId } from 'utils/constants';
import { UserSession } from 'interfaces/props';
import WarningModalContents from 'components/WarningModalContents';

const deleteTeamModalId = 'delete-team-modal';
const editTeamNameModalId = 'edit-team-name-modal';

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

const UnpaddedButton = styled(Button)`
  &&& {
    margin: 0;
  }
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

const NewEntityButton = ({
  tableTab,
  handleNewIntegrationClick,
  handleNewTeamClick,
}: {
  tableTab?: string;
  handleNewTeamClick: Function;
  handleNewIntegrationClick: Function;
}) => {
  if (tableTab === 'activeTeams')
    return (
      <UnpaddedButton size="large" onClick={handleNewTeamClick} variant="callout">
        + Create a new Team
      </UnpaddedButton>
    );
  if (tableTab === 'activeProjects')
    return (
      <Button size="large" onClick={handleNewIntegrationClick} variant="callout">
        + Request Integration
      </Button>
    );
  return null;
};

const teamHasIntegrationsMessage =
  'Before you delete this team, you will need to delete the integration(s) the team is responsible for.';
const teamHasNoIntegrationsMessage = 'Once you delete this team, this action cannot be undone.';

interface Props {
  currentUser: UserSession;
}

export default function ProjectTeamTabs({ currentUser }: Props) {
  const router = useRouter();
  const { state, dispatch } = useContext(RequestsContext);
  const { requests, teams, activeRequestId, tableTab, downloadError, activeTeamId, teamIdToDelete } = state;

  const selectedRequest = requests?.find((request) => request.id === activeRequestId);
  const selectedTeam = teams?.find((team) => team.id === activeTeamId);
  const teamRequests = requests?.filter((request) => Number(request.teamId) === activeTeamId);
  const teamHasIntegrations = teamRequests && teamRequests.length > 0;

  const handleProjectSelection = async (request: Request) => {
    if (activeRequestId === request.id) return;
    dispatch($setActiveRequestId(request.id));
  };

  const handleTeamSelection = async (team: Team) => dispatch($setActiveTeamId(team?.id));

  const handleNewIntegrationClick = async () => {
    router.push('/request');
  };

  const handleNewTeamClick = async () => (window.location.hash = createTeamModalId);
  const loadTeams = async () => {
    const [teams, err] = await getTeams();
    if (err) dispatch($setDownloadError(true));
    else dispatch($setTeams(teams || []));
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const showDeleteModal = async (teamId: number) => {
    window.location.hash = deleteTeamModalId;
    dispatch($setTeamIdToDelete(teamId));
  };

  const showEditTeamNameModal = async (teamId: number) => {
    // TODO: figure out what's going on with this location hash
    console.log('Edit team name clicked');
    window.location.hash = editTeamNameModalId;
    dispatch($setTeamIdToEdit(teamId));
  };

  const getTableContents = (tableTab?: string) => {
    if (downloadError) return SystemUnavailableMessage;
    if (tableTab === 'activeProjects' && requests?.length === 0)
      return <NoEntitiesMessage message="No Requests Submitted" />;
    if (tableTab === 'activeProjects')
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
            {requests?.map((request: Request) => (
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
            ))}
          </tbody>
        </Table>
      );
    if (tableTab === 'activeTeams' && teams?.length === 0)
      return <NoEntitiesMessage message="You have not been added to any teams yet." />;
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
                    key={team.id}
                    onClick={() => handleTeamSelection(team)}
                  >
                    <td>{team.name}</td>
                    <td>
                      <ActionButtonContainer>
                        <ActionButton
                          icon={faEdit}
                          role="button"
                          aria-label="edit"
                          title="Edit"
                          size="lg"
                          onClick={() => showEditTeamNameModal(team.id)}
                        />
                        <ActionButton
                          icon={faTrash}
                          role="button"
                          aria-label="edit"
                          title="Edit"
                          size="lg"
                          onClick={() => showDeleteModal(team.id)}
                        />
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

  const handleDeleteTeam = async () => {
    if (teamHasIntegrations) return;
    await deleteTeam(teamIdToDelete);
    await loadTeams();
  };

  return (
    <>
      <RequestTabs onSelect={(key: string) => dispatch($setTableTab(key))} activeKey={tableTab}>
        <Tab eventKey="activeProjects" title="My Projects" />
        <Tab eventKey="activeTeams" title="My Teams" />
      </RequestTabs>
      <br />
      <NewEntityButton
        tableTab={tableTab}
        handleNewIntegrationClick={handleNewIntegrationClick}
        handleNewTeamClick={handleNewTeamClick}
      />
      <br />
      <br />
      {content}
      <CenteredModal
        title="Create a new team"
        icon={null}
        onConfirm={() => console.log('confirm')}
        id={createTeamModalId}
        content={<TeamForm onSubmit={loadTeams} currentUser={currentUser} />}
        showCancel={false}
        showConfirm={false}
        closable
      />
      <CenteredModal
        title="Edit Team Name"
        icon={null}
        onConfirm={() => console.log('confirm')}
        id={editTeamNameModalId}
        content={<EditTeamNameForm onSubmit={loadTeams} currentUser={currentUser} />}
        showCancel={false}
        showConfirm={false}
        closable
      />
      <CenteredModal
        title="Delete team"
        icon={null}
        onConfirm={handleDeleteTeam}
        id={deleteTeamModalId}
        content={
          <WarningModalContents
            title="Are you sure that you want to delete this team?"
            content={teamHasIntegrations ? teamHasIntegrationsMessage : teamHasNoIntegrationsMessage}
          />
        }
        buttonStyle={teamHasIntegrations ? 'custom' : 'danger'}
        confirmText={teamHasIntegrations ? 'Okay' : 'Delete Team'}
        closable
      />
    </>
  );
}
