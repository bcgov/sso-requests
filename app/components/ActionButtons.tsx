import { useContext, MouseEvent } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { Request } from 'interfaces/Request';
import { $setEditingRequest } from 'dispatchers/requestDispatcher';
import { PRIMARY_RED } from 'styles/theme';

const Container = styled.div`
  height: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-right: 13px;
`;

const ActionButton = styled(FontAwesomeIcon)<{ disabled?: boolean }>`
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  ${(props) => (props.disabled ? `color: #CACACA;` : `color: #777777;&:hover { color: #137ac8; }`)}
`;

const DeleteButton = styled(ActionButton)<{ disabled?: boolean }>`
  margin-right: 15px;
  &:hover {
    ${(props) => (props?.disabled ? '' : `color: ${PRIMARY_RED};`)}
  }
`;

const EditButton = styled(ActionButton)`
  margin-left: 15px;
`;

const VerticalLine = styled.div`
  height: 40px;
  border-right: 2px solid #e3e3e3;
`;

interface Props {
  request: Request;
  selectedRequest: Request;
  setSelectedId: Function;
}

export default function Actionbuttons({ selectedRequest, request, setSelectedId }: Props) {
  const { state, dispatch } = useContext(RequestsContext);
  const router = useRouter();
  const { editingRequest } = state as RequestReducerState;
  const canDelete = !['pr', 'planned', 'submitted'].includes(request?.status || '');

  const handleEdit = (event: MouseEvent) => {
    if (request.status === 'draft') {
      router.push(`/request/${request.id}`);
      return;
    }

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

  const canEdit = ['draft', 'applied'].includes(request.status || '');

  return (
    <>
      <Container>
        <DeleteButton
          icon={faTrash}
          role="button"
          aria-label="delete"
          onClick={handleDelete}
          disabled={!canDelete}
          title="Delete"
        />
        <VerticalLine />
        <EditButton
          disabled={!canEdit}
          icon={faEdit}
          role="button"
          aria-label="edit"
          onClick={handleEdit}
          title="Edit"
        />
      </Container>
    </>
  );
}
