import { useContext, MouseEvent } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { Request } from 'interfaces/Request';
import { $setEditingRequest } from 'dispatchers/requestDispatcher';
import { PRIMARY_RED } from 'styles/theme';

export const Container = styled.div`
  height: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-right: 15px;
`;

export const ActionButton = styled(FontAwesomeIcon)<{ disabled?: boolean; activeColor?: string; isUnread?: boolean }>`
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  ${(props) =>
    props.disabled ? `color: #CACACA;` : `color: #777777;&:hover { color: ${props.activeColor || '#137ac8'}; }`}
  ${(props) => (props.isUnread ? `color: ${PRIMARY_RED}` : '')};
`;

export const VerticalLine = styled.div`
  height: 40px;
  border-right: 2px solid #e3e3e3;
`;

interface Props {
  request: Request;
  selectedRequest: Request;
  setSelectedId: Function;
  setActiveTab: Function;
  archived?: boolean;
}

export default function Actionbuttons({
  selectedRequest,
  request,
  setSelectedId,
  setActiveTab,
  archived = false,
}: Props) {
  const { state, dispatch } = useContext(RequestsContext);
  const router = useRouter();
  const { editingRequest } = state as RequestReducerState;
  const canDelete = !archived && !['pr', 'planned', 'submitted'].includes(request?.status || '');

  const handleEdit = async (event: MouseEvent) => {
    if (request.status === 'draft') return await router.push(`/request/${request.id}`);
    setActiveTab('configuration-url');
    event.stopPropagation();
    if (selectedRequest?.id === request.id) {
      dispatch($setEditingRequest(!editingRequest));
    } else {
      dispatch($setEditingRequest(true));
      setSelectedId(request.id);
    }
  };

  const handleDelete = async (event: MouseEvent) => {
    if (!request.id || !canDelete) return;
    window.location.hash = 'delete-modal';
  };

  const handleViewChanges = async () => {
    setActiveTab('data-changes');
    request.hasUnreadNotifications = false;
  };

  const canEdit = !archived && ['draft', 'applied'].includes(request.status || '');

  return (
    <>
      <Container>
        <ActionButton
          disabled={!canEdit}
          icon={faEdit}
          role="button"
          aria-label="edit"
          onClick={handleEdit}
          title="Edit"
        />
        <VerticalLine />
        <ActionButton
          icon={faComment}
          role="button"
          aria-label="view-events"
          onClick={handleViewChanges}
          activeColor={PRIMARY_RED}
          title="Events"
          isUnread={request?.hasUnreadNotifications}
        />
        <VerticalLine />
        <ActionButton
          icon={faTrash}
          role="button"
          aria-label="delete"
          onClick={handleDelete}
          disabled={!canDelete}
          activeColor={PRIMARY_RED}
          title="Delete"
        />
      </Container>
    </>
  );
}
