import { useContext, MouseEvent, useState } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { Request } from 'interfaces/Request';
import { deleteRequest } from 'services/request';
import { $deleteRequest, $setEditingRequest } from 'dispatchers/requestDispatcher';
import Loader from 'react-loader-spinner';

const Container = styled.div`
  height: 100%;
  display: flex;
`;

const ActionButton = styled(FontAwesomeIcon)<{ disabled?: boolean }>`
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  ${(props) => (props.disabled ? `color: #CACACA;` : `color: #777777;&:hover { color: #137ac8; }`)}
`;

const DeleteButton = styled(ActionButton)`
  border-right: 1px solid #777777;
  padding-right: 10px;
`;

const EditButton = styled(ActionButton)`
  padding-left: 10px;
`;

interface Props {
  request: Request;
  selectedRequest: Request;
  setSelectedId: Function;
}

export default function Actionbuttons({ request, selectedRequest, setSelectedId }: Props) {
  const { state, dispatch } = useContext(RequestsContext);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const { editingRequest } = state as RequestReducerState;
  const canDelete = !['pr', 'planned', 'submitted'].includes(request.status || '');

  const handleEdit = (event: MouseEvent) => {
    event.stopPropagation();

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
    event.stopPropagation();
    if (!request.id || !canDelete) return;
    setDeleting(true);
    const [_deletedRequest, _err] = await deleteRequest(request.id);
    dispatch($deleteRequest(request.id));
    setDeleting(false);
  };

  const canEdit = ['draft', 'applied'].includes(request.status || '');

  return (
    <Container>
      {deleting ? (
        <Loader type="TailSpin" height={28} width={32} />
      ) : (
        <DeleteButton
          icon={faTrash}
          size="2x"
          role="button"
          aria-label="delete"
          onClick={handleDelete}
          disabled={!canDelete}
        />
      )}
      <EditButton
        disabled={!canEdit}
        icon={faEdit}
        size="2x"
        role="button"
        aria-label="edit"
        onClick={handleEdit}
        title="Edit"
      />
    </Container>
  );
}
