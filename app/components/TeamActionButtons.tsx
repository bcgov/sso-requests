import { canDeleteTeam, canEditTeam } from '@app/helpers/permissions';
import { Team } from '@app/interfaces/team';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import noop from 'lodash.noop';
import { ActionButtonContainer, ActionButton } from './ActionButtons';

interface Props {
  team: Team;
  showEditTeamNameModal: (team: Team) => void;
  showDeleteModal: (team: Team) => void;
}

export default function TeamActionButtons({ team, showEditTeamNameModal, showDeleteModal }: Props) {
  const canDelete = canDeleteTeam(team);
  const canEdit = canEditTeam(team);

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
          data-testid="edit-team-button"
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
          data-testid="delete-team-button"
        />
      </ActionButtonContainer>
    </>
  );
}
