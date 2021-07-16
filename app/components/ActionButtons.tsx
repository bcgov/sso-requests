import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { RequestsContext } from 'pages/my-requests';
import { useContext } from 'react';
import { RequestReducerState } from 'reducers/requestReducer';
import { MouseEvent } from 'react';

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
  currentId: number;
}

export default function Actionbuttons({ currentId }: Props) {
  const { state, dispatch } = useContext(RequestsContext);
  const { editingRequest, requestId } = state as RequestReducerState;

  const handleEdit = (event: MouseEvent) => {
    if (currentId === requestId) {
      event.stopPropagation();
      dispatch({ type: 'setEditingRequest', payload: !editingRequest });
    } else {
      dispatch({ type: 'setEditingRequest', payload: true });
    }
  };

  return (
    <Container>
      {/* TODO: Decide on delete functionality */}
      <DeleteButton icon={faTrash} size="2x" role="button" aria-label="delete" />
      <EditButton icon={faEdit} size="2x" role="button" aria-label="edit" onClick={handleEdit} />
    </Container>
  );
}
