import React, { useState } from 'react';
import Modal from '@button-inc/bcgov-theme/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import BcButton from '@button-inc/bcgov-theme/Button';
import CancelButton from 'components/CancelButton';
import Loader from 'react-loader-spinner';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const StyledModal = styled(Modal)`
  display: flex;
  align-items: center;

  & .pg-modal-main {
    max-width: 600px;
    margin: auto;
  }
`;

const PaddedIcon = styled(FontAwesomeIcon)`
  margin-right: 20px;
`;

const ButtonContainer = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  & button {
    min-width: 150px;
    margin-right: 20px;
    display: inline-block;
  }
`;

interface Props {
  onConfirm: Function;
  content: any;
  icon?: any;
  id: string;
  title?: string;
  closable?: boolean;
  showCancel?: boolean;
  confirmText?: string;
}

const CenteredModal = ({
  onConfirm,
  content,
  id,
  title,
  closable,
  icon = faExclamationTriangle,
  confirmText = 'Confirm',
  showCancel = true,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const handleCancel = () => (window.location.hash = '#');

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    window.location.hash = '#';
  };

  return (
    <StyledModal id={id}>
      <Modal.Header>
        <PaddedIcon icon={icon} title="Information" size="2x" style={{ paddingRight: '10px' }} />
        {title}
        {closable && <Modal.Close onClick={handleCancel}>X</Modal.Close>}
      </Modal.Header>
      <Modal.Content>
        {content}
        <ButtonContainer>
          {showCancel && (
            <CancelButton variant="secondary" onClick={handleCancel}>
              Cancel
            </CancelButton>
          )}
          <BcButton onClick={handleConfirm}>
            {loading ? <Loader type="Grid" color="#FFF" height={18} width={50} visible={loading} /> : confirmText}
          </BcButton>
        </ButtonContainer>
      </Modal.Content>
    </StyledModal>
  );
};

export default CenteredModal;
