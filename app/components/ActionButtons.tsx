import { useContext, MouseEvent } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { RequestsContext } from 'pages/my-requests';
import { Request } from 'interfaces/Request';
import { $setRequestToDelete } from 'dispatchers/requestDispatcher';
import { PRIMARY_RED } from 'styles/theme';

export const ActionButtonContainer = styled.div`
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 15px;
  & > * {
    margin-left: 15px;
  }
`;

export const ActionButton = styled(FontAwesomeIcon)<{ disabled?: boolean; activeColor?: string; isUnread?: boolean }>`
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
  children?: any;
}

export default function Actionbuttons({ request, children }: Props) {
  const { state, dispatch } = useContext(RequestsContext);

  const router = useRouter();
  const { archived } = request || {};
  const canDelete = !archived && !['pr', 'planned', 'submitted'].includes(request?.status || '');
  const canEdit = !archived && ['draft', 'applied'].includes(request.status || '');

  const handleEdit = async (event: MouseEvent) => {
    event.stopPropagation();
    if (!canEdit) return;
    await router.push(`/request/${request.id}`);
  };

  const handleDelete = async () => {
    if (!request.id || !canDelete) return;
    dispatch($setRequestToDelete(request.id));
    window.location.hash = 'delete-modal';
  };

  return (
    <>
      <ActionButtonContainer>
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
    </>
  );
}
