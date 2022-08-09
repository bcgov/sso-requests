import React, { useContext, useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Table } from '@bcgov-sso/common-react-components';
import styled from 'styled-components';
import { noop } from 'lodash';
import { $setDownloadError } from 'dispatchers/requestDispatcher';
import { Button, NumberedContents } from '@bcgov-sso/common-react-components';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faExclamationCircle, faTrash, faEdit, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Team } from 'interfaces/team';
import { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import { getMyTeams, deleteTeam, getServiceAccount, deleteServiceAccount } from 'services/team';
import TeamForm from 'form-components/team-form/CreateTeamForm';
import EditTeamNameForm from 'form-components/team-form/EditTeamNameForm';
import CenteredModal from 'components/CenteredModal';
import { createTeamModalId } from 'utils/constants';
import { UserSession } from 'interfaces/props';
import PageLoader from 'components/PageLoader';
import WarningModalContents from 'components/WarningModalContents';
import { DashboardReducerState } from 'reducers/dashboardReducer';
import { Request } from 'interfaces/Request';

const deleteTeamModalId = 'delete-team-modal';
const editTeamNameModalId = 'edit-team-name-modal';

const RightAlignHeader = styled.th`
  text-align: right;
  min-width: 100px;
`;

const RightFloatButtons = styled.td`
  float: right;
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

const NewEntityButton = ({ handleNewTeamClick }: { handleNewTeamClick: Function }) => {
  return (
    <UnpaddedButton size="large" onClick={handleNewTeamClick} variant="callout">
      + Create a new Team
    </UnpaddedButton>
  );
};

const teamHasIntegrationsMessage =
  'Before you delete this team, you will need to delete the integration(s) the team is responsible for.';
const teamHasNoIntegrationsMessage = 'Once you delete this team, this action cannot be undone.';

interface Props {
  currentUser: UserSession;
  setTeam: Function;
  loading: boolean;
  teams: Team[];
  loadTeams: () => void;
  state: DashboardReducerState;
  dispatch: Dispatch<SetStateAction<any>>;
}

export default function TeamList({ currentUser, setTeam, loading, teams, loadTeams, state, dispatch }: Props) {
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<number | undefined>(undefined);
  const [serviceAccount, setServiceAccount] = useState<Request | null>(null);
  const { downloadError } = state;

  const deleteServiceAccontNote =
    '*By deleting this team, you are also deleting the CSS App API Account that belongs to this team.';

  const canDelete = activeTeam && Number(activeTeam.integrationCount) === 0;

  const updateActiveTeam = (team: Team | null) => {
    setActiveTeam(team);
    setActiveTeamId(team?.id);
    setTeam(team);
  };

  const updateServiceAccount = async () => {
    const [serviceAccount] = await getServiceAccount(activeTeamId);

    if (serviceAccount) setServiceAccount(serviceAccount);
    else setServiceAccount(null);
  };

  useEffect(() => {
    if (teams?.length > 0) {
      if (!activeTeamId || !teams.find((team) => team.id === activeTeamId)) {
        updateActiveTeam(teams[0]);
      }
    } else {
      updateActiveTeam(null);
    }
  }, [teams]);

  useEffect(() => {
    updateServiceAccount();
  }, [activeTeamId]);

  const handleNewTeamClick = async () => (window.location.hash = createTeamModalId);

  const showDeleteModal = (team: Team) => {
    updateActiveTeam(team);
    window.location.hash = deleteTeamModalId;
  };

  const showEditTeamNameModal = (team: Team) => {
    updateActiveTeam(team);
    window.location.hash = editTeamNameModalId;
  };

  const getTableContents = () => {
    if (downloadError) return SystemUnavailableMessage;

    if (!teams || teams?.length === 0) return <NoEntitiesMessage message="You have not been added to any teams yet." />;

    return (
      <Table>
        <thead>
          <tr>
            <th>Team Name</th>
            <RightAlignHeader>Actions</RightAlignHeader>
          </tr>
        </thead>
        <tbody>
          {teams &&
            teams.map((team: Team) => {
              const canDelete = Number(team.integrationCount) === 0;
              return (
                <tr
                  className={activeTeamId === team.id ? 'active' : ''}
                  key={team.id}
                  onClick={() => updateActiveTeam(team)}
                >
                  <td>{team.name}</td>
                  <td>
                    <RightFloatButtons>
                      <ActionButtonContainer>
                        <ActionButton
                          icon={faEdit}
                          role="button"
                          aria-label="edit"
                          title="Edit"
                          size="lg"
                          onClick={() => showEditTeamNameModal(team)}
                        />
                        <ActionButton
                          disabled={!canDelete}
                          icon={faTrash}
                          role="button"
                          aria-label="delete"
                          title="Delete"
                          size="lg"
                          onClick={() => (canDelete ? showDeleteModal(team) : noop)}
                          style={{ marginLeft: '7px' }}
                        />
                      </ActionButtonContainer>
                    </RightFloatButtons>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </Table>
    );
  };

  const content = getTableContents();

  const handleDeleteTeam = async () => {
    if (!canDelete) return;

    if (serviceAccount) await deleteServiceAccount(activeTeamId, serviceAccount.id);

    await deleteTeam(activeTeamId);
    await loadTeams();
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <br />
      <NewEntityButton handleNewTeamClick={handleNewTeamClick} />
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
        content={
          <EditTeamNameForm
            onSubmit={loadTeams}
            teamId={activeTeamId as number}
            initialTeamName={activeTeam?.name || ''}
          />
        }
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
            content={canDelete ? teamHasNoIntegrationsMessage : teamHasIntegrationsMessage}
            note={canDelete && serviceAccount ? deleteServiceAccontNote : ''}
          />
        }
        buttonStyle={canDelete ? 'danger' : 'custom'}
        confirmText={canDelete ? 'Delete Team' : 'Okay'}
        closable
      />
    </>
  );
}
