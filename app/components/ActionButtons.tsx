import { MouseEvent } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { Integration } from 'interfaces/Request';
import { deleteRequest } from 'services/request';
import { PRIMARY_RED } from 'styles/theme';
import noop from 'lodash.noop';
import { canDeleteIntegration, canEditIntegration } from '@app/helpers/permissions';
import DeleteModal from './DeleteModal';

export const ActionButtonContainer = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-right: 15px;
  & > * {
    margin-left: 15px;
  }
`;

interface StyledActionButtonProps {
  disabled?: boolean;
  activeColor?: string;
  isUnread?: boolean;
}

export const ActionButton = styled(({ disabled, activeColor, isUnread, ...props }) => (
  <FontAwesomeIcon {...props} />
))<StyledActionButtonProps>`
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  ${(props) =>
    props.disabled ? `color: #CACACA;` : `color: inherit; &:hover { color: ${props.activeColor || '#000'}; }`}
  ${(props) => (props.isUnread ? `color: ${PRIMARY_RED}` : '')};
`;

export const VerticalLine = styled.div`
  height: 40px;
  border-right: 2px solid #e3e3e3;
`;

interface Props {
  request: Integration;
  onDelete?: Function;
  defaultActiveColor?: string;
  children?: any;
  editIconStyle?: any;
  delIconStyle?: any;
}

export default function Actionbuttons({
  request,
  onDelete,
  defaultActiveColor,
  children,
  editIconStyle = {},
  delIconStyle = {},
}: Props) {
  const router = useRouter();
  const { archived } = request || {};
  const canDelete = canDeleteIntegration(request);
  const canEdit = canEditIntegration(request);
  const deleteModalId = `delete-modal-${request?.id}`;

  const handleEdit = async (event: MouseEvent) => {
    event.stopPropagation();
    if (!canEdit) return;
    await router.push(`/request/${request.id}?status=${request.status}`);
  };

  const handleDelete = () => {
    if (!request.id || !canDelete) return;
    window.location.hash = deleteModalId;
  };

  const confirmDelete = async () => {
    const canDelete = !['pr', 'planned', 'submitted'].includes(request?.status || '');
    if (!canDelete) return;

    const [_result, error] = await deleteRequest(request.id);
    window.location.hash = '#';
    if (onDelete) onDelete(request, error);
  };

  return (
    <>
      <ActionButtonContainer>
        {children}
        <ActionButton
          disabled={!canEdit}
          icon={faEdit}
          role="button"
          data-testid="action-button-edit"
          aria-label="edit"
          onClick={handleEdit}
          activeColor={defaultActiveColor}
          title="Edit"
          size="lg"
          style={editIconStyle}
        />
        <ActionButton
          icon={faTrash}
          role="button"
          data-testid="action-button-delete"
          aria-label="delete"
          onClick={canDelete ? handleDelete : noop}
          disabled={!canDelete}
          activeColor={PRIMARY_RED}
          title="Delete"
          size="lg"
          style={delIconStyle}
        />
      </ActionButtonContainer>
      <DeleteModal
        projectName={request.projectName}
        id={deleteModalId}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        content="You are about to delete this integration request. This action cannot be undone."
        confirmText="Delete"
      />
    </>
  );
}
