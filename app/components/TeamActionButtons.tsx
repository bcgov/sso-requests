import { getLoggedInTeamMember } from '@app/helpers/util';
import { UserSession } from '@app/interfaces/props';
import { Team, User } from '@app/interfaces/team';
import { getTeamMembers } from '@app/services/team';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import noop from 'lodash.noop';
import { useEffect, useState } from 'react';
import { ActionButtonContainer, ActionButton } from './ActionButtons';

interface Props {
  currentUser: UserSession;
  team: Team;
  showEditTeamNameModal: (team: Team) => void;
  showDeleteModal: (team: Team) => void;
}

export default function TeamActionButtons({ currentUser, team, showEditTeamNameModal, showDeleteModal }: Props) {
  const [loggedInTeamMember, setLoggedInTeamMember] = useState<User | null>(null);
  const canDelete = Number(team.integrationCount) === 0 && loggedInTeamMember?.role === 'admin';
  const canEdit = loggedInTeamMember?.role === 'admin';
  useEffect(() => {
    getLoggedInTeamMember(team.id, currentUser).then((teamMember) => {
      setLoggedInTeamMember(teamMember);
    });
  }, [team.id]);

  return (
    <>
      <ActionButtonContainer>
        <ActionButton
          disabled={!canEdit}
          icon={faEdit}
          role="button"
          aria-label="edit"
          title="Edit"
          size="lg"
          onClick={() => (canEdit ? showEditTeamNameModal(team) : noop)}
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
    </>
  );
}
