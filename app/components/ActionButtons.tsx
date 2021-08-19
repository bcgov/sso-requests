import { useContext, MouseEvent } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { Request } from 'interfaces/Request';
import { $setEditingRequest } from 'dispatchers/requestDispatcher';

const Container = styled.div`
  height: 100%;
  display: flex;
`;

const DeleteButton = styled(FontAwesomeIcon)`
  border-right: 1px solid #777777;
  padding-right: 10px;
  color: #777777;
  cursor: not-allowed;
`;
const EditButton = styled(FontAwesomeIcon)<{ disabled?: boolean }>`
  padding-left: 10px;
  cursor: pointer;
  ${(props) => (props.disabled ? `color: #CACACA;` : `color: #777777;&:hover { color: #137ac8; }`)}
`;

interface Props {
  request: Request;
  selectedRequest: Request;
  setSelectedId: Function;
}

export default function Actionbuttons({ request, selectedRequest, setSelectedId }: Props) {
  const { state, dispatch } = useContext(RequestsContext);
  const router = useRouter();

  const { editingRequest } = state as RequestReducerState;

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

  const canEdit = ['draft', 'applied'].includes(request.status || '');

  return (
    <Container>
      {/* TODO: Decide on delete functionality */}
      {/* <DeleteButton icon={faTrash} size="2x" role="button" aria-label="delete" /> */}
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
