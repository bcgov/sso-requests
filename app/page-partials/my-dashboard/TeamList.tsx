import React, { useState, useEffect } from 'react';
import Table from 'components/TableNew';
import styled from 'styled-components';
import { Button } from '@bcgov-sso/common-react-components';
import { Team } from 'interfaces/team';
import { deleteTeam, deleteServiceAccount, getTeamMembers, getServiceAccounts } from 'services/team';
import TeamForm from 'form-components/team-form/CreateTeamForm';
import EditTeamNameForm from 'form-components/team-form/EditTeamNameForm';
import CenteredModal from 'components/CenteredModal';
import { createTeamModalId } from 'utils/constants';
import { UserSession } from 'interfaces/props';
import PageLoader from 'components/PageLoader';
import WarningModalContents from 'components/WarningModalContents';
import { Integration } from 'interfaces/Request';
import TeamActionButtons from '@app/components/TeamActionButtons';
import isEmpty from 'lodash.isempty';
import { SystemUnavailableMessage, NoEntitiesMessage } from './Messages';
import ErrorText from '@app/components/ErrorText';
import { TopAlert, withTopAlert } from '@app/layout/TopAlert';

const deleteTeamModalId = 'delete-team-modal';
const editTeamNameModalId = 'edit-team-name-modal';

const RightFloatButtons = styled.tr`
  float: right;
  padding-right: 0.5em;
`;

function TeamListActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '1em' }}>Actions</span>;
}

const UnpaddedButton = styled(Button)`
  &&& {
    margin: 0;
  }
`;

const NewEntityButton = ({ handleNewTeamClick }: { handleNewTeamClick: Function }) => {
  return (
    <UnpaddedButton size="large" onClick={handleNewTeamClick} variant="callout">
      + Create a New Team
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
  hasError: boolean;
  alert: TopAlert;
}

function TeamList({ currentUser, setTeam, loading, teams, loadTeams, hasError, alert }: Readonly<Props>) {
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<number | undefined>(undefined);
  const [serviceAccounts, setServiceAccounts] = useState<Integration[]>([]);
  const [teamDeleteError, setTeamDeleteError] = useState(false);

  const deleteServiceAccontNote =
    '*By deleting this team, you are also deleting the CSS App API Account that belongs to this team.';

  const canDelete = activeTeam && Number(activeTeam.integrationCount) === 0;

  const updateActiveTeam = (team: Team | null) => {
    setActiveTeam(team);
    setActiveTeamId(team?.id);
    setTeam(team);
  };

  const updateServiceAccounts = async () => {
    if (activeTeam?.role === 'admin') {
      const [data, error] = await getServiceAccounts(activeTeamId);
      if (error) {
        alert.show({ variant: 'danger', content: 'Failed to load service accounts for team. Please refresh.' });
        return;
      }
      setServiceAccounts(data);
    } else {
      setServiceAccounts([]);
    }
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
    if (Number(activeTeam?.serviceAccountCount) > 0) {
      updateServiceAccounts();
    }
  }, [activeTeamId]);

  const handleNewTeamClick = async () => (window.location.hash = createTeamModalId);

  const showDeleteModal = (team: Team) => {
    setTeamDeleteError(false);
    updateActiveTeam(team);
    if (activeTeamId !== team.id) return;
    window.location.hash = deleteTeamModalId;
  };

  const showEditTeamNameModal = (team: Team) => {
    updateActiveTeam(team);
    window.location.hash = editTeamNameModalId;
  };

  const activateRow = (request: any) => {
    const teamId = request['cells'][0].row.original.teamId;
    teams.forEach((team) => {
      if (team.id == teamId) updateActiveTeam(team);
    });
  };

  const getTableContents = () => {
    if (hasError) return <SystemUnavailableMessage />;

    if (!teams || teams?.length === 0) return <NoEntitiesMessage message="You have not been added to any teams yet." />;

    return (
      <Table
        headers={[
          {
            accessor: 'name',
            Header: 'Team Name',
          },
          {
            accessor: 'actions',
            Header: <TeamListActionsHeader />,
            disableSortBy: true,
          },
        ]}
        data={
          teams &&
          teams.map((team: Team) => {
            return {
              teamId: team.id,
              name: team.name,
              actions: (
                <RightFloatButtons>
                  <TeamActionButtons
                    team={team}
                    showEditTeamNameModal={showEditTeamNameModal}
                    showDeleteModal={showDeleteModal}
                  />
                </RightFloatButtons>
              ),
            };
          })
        }
        activateRow={activateRow}
        rowSelectorKey={'teamId'}
        activeSelector={activeTeamId}
        colfilters={[]}
      />
    );
  };

  const content = getTableContents();

  const handleDeleteTeam = async () => {
    setTeamDeleteError(false);
    if (!canDelete) return;

    if (serviceAccounts.length > 0) {
      Promise.all(
        serviceAccounts.map((serviceAccount: Integration) => {
          deleteServiceAccount(activeTeamId, serviceAccount.id);
        }),
      );
    }

    const [_result, error] = await deleteTeam(activeTeamId);
    if (error) {
      setTeamDeleteError(true);
    } else {
      await loadTeams();
    }
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
        title="Create a New Team"
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
          <>
            <WarningModalContents
              title="Are you sure that you want to delete this team?"
              content={canDelete ? teamHasNoIntegrationsMessage : teamHasIntegrationsMessage}
              note={canDelete && !isEmpty(serviceAccounts) ? deleteServiceAccontNote : ''}
            />
            {teamDeleteError && <ErrorText>Failed to delete. Please try again</ErrorText>}
          </>
        }
        buttonStyle={canDelete ? 'danger' : 'custom'}
        confirmText={canDelete ? 'Delete Team' : 'Okay'}
        skipCloseOnConfirm={true}
        closable
      />
    </>
  );
}

export default withTopAlert(TeamList);
