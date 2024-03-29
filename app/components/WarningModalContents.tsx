import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const RedIcon = styled(FontAwesomeIcon)`
  color: #ff0303;
`;

const ModalContentContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 6fr;
`;

const ModalContents = ({ title, content, note }: { title?: string; content?: string; note?: string }) => (
  <ModalContentContainer>
    <RedIcon icon={faExclamationCircle} size="3x" />
    <div>
      {title && <strong>{title}</strong>}
      {content && <p>{content}</p>}
      {note && <i>{note}</i>}
    </div>
  </ModalContentContainer>
);

export default ModalContents;
