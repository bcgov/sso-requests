import { MouseEvent } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { Request } from 'interfaces/Request';
import CenteredModal from 'components/CenteredModal';
import { getRequests, deleteRequest } from 'services/request';
import { PRIMARY_RED } from 'styles/theme';

export const ActionButtonContainer = styled.div<{ paddingRight?: string; marginLeft?: string }>`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  ${(props) => `padding-right: ${props.paddingRight};`}
  & > * {
    ${(props) => `margin-left: ${props.marginLeft};`}
`;

ActionButtonContainer.defaultProps = {
  paddingRight: '15px',
  marginLeft: '15px',
};

export const ActionButton = styled(FontAwesomeIcon)<{
  disabled?: boolean;
  activeColor?: string;
  isUnread?: boolean;
}>`
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  ${(props) =>
    props.disabled ? `color: #CACACA;` : `color: black; &:hover { color: ${props.activeColor || '#137ac8'}; }`}
  ${(props) => (props.isUnread ? `color: ${PRIMARY_RED}` : '')};
`;

export const VerticalLine = styled.div`
  height: 40px;
  border-right: 2px solid #e3e3e3;
`;

interface Props {
  request: Request;
  onDelete?: Function;
  children?: any;
  paddingRight?: string;
}

export default function Actionbuttons({ request, onDelete, children, paddingRight }: Props) {
  const router = useRouter();
  const { archived } = request || {};
  const canDelete = !archived && !['pr', 'planned', 'submitted'].includes(request?.status || '');
  const canEdit = !archived && ['draft', 'applied'].includes(request.status || '');
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

    await deleteRequest(request.id);
    window.location.hash = '#';
    if (onDelete) onDelete(request);
  };

  return (
    <>
      <ActionButtonContainer paddingRight={paddingRight}>
        {children}
        <ActionButton
          disabled={!canEdit}
          icon={faEdit}
          role="button"
          aria-label="edit"
          onClick={handleEdit}
          title="Edit"
          size="lg"
        />
        <ActionButton
          icon={faTrash}
          role="button"
          aria-label="delete"
          onClick={handleDelete}
          disabled={!canDelete}
          activeColor={PRIMARY_RED}
          title="Delete"
          size="lg"
        />
      </ActionButtonContainer>
      <CenteredModal
        id={deleteModalId}
        content="You are about to delete this integration request. This action cannot be undone."
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        confirmText="Delete"
      />
    </>
  );
}
