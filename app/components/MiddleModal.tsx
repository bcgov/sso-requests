import styled from 'styled-components';
import Modal from '@button-inc/bcgov-theme/Modal';

const MiddleModal = styled(Modal)`
  display: flex;
  align-items: center;

  & .pg-modal-main {
    margin: auto;
  }

  z-index: 100;
`;

export default MiddleModal;
