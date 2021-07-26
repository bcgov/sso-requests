import { useContext, MouseEvent } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { ClientRequest } from 'interfaces/Request';
import { $setRequest, $setEditingRequest } from 'dispatchers/requestDispatcher';

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
const EditButton = styled(FontAwesomeIcon)`
  padding-left: 10px;
  color: #777777;
  cursor: pointer;
  &:hover {
    color: #137ac8;
  }
`;

interface Props {
  request: ClientRequest;
}

export default function Actionbuttons({ request }: Props) {
  const { state, dispatch } = useContext(RequestsContext);
  const router = useRouter();

  const { editingRequest, selectedRequest } = state as RequestReducerState;

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
      dispatch($setRequest(request));
    }
  };

  return (
    <Container>
      {/* TODO: Decide on delete functionality */}
      {/* <DeleteButton icon={faTrash} size="2x" role="button" aria-label="delete" /> */}
      {['draft', 'applied'].includes(request.status || '') && (
        <EditButton icon={faEdit} size="2x" role="button" aria-label="edit" onClick={handleEdit} />
      )}
    </Container>
  );
}
