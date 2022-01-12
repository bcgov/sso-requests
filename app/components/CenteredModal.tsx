import React, { useState } from 'react';
import Modal from '@button-inc/bcgov-theme/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@bcgov-sso/common-react-components';

const StyledModal = styled(Modal)`
  display: flex;
  align-items: center;

  & .pg-modal-main {
    max-width: 600px;
    margin: auto;
  }
`;

const Header = styled(Modal.Header)`
  font-size: 1.5em;
  padding: 0.75em;
  background: #38598a;
  color: #fff;
  & a {
    float: right;
  }
`;

const PaddedIcon = styled(FontAwesomeIcon)`
  margin-right: 20px;
`;

const ButtonContainer = styled.div<{ buttonAlign: 'default' | 'center' }>`
  margin-top: 20px;
  display: flex;
  justify-content: ${(props) => (props.buttonAlign === 'center' ? 'center;' : 'flex-end;')} & button {
    min-width: 150px;
    margin-right: 20px;
    display: inline-block;
  }
`;

interface Props {
  onConfirm?: Function;
  content: any;
  icon?: any;
  id: string;
  title?: string;
  closable?: boolean;
  showCancel?: boolean;
  showConfirm?: boolean;
  confirmText?: string;
  buttonStyle?: 'bcgov' | 'custom';
  buttonAlign?: 'center' | 'default';
  skipCloseOnConfirm?: boolean;
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
  showConfirm = true,
  buttonStyle = 'bcgov',
  buttonAlign = 'default',
  skipCloseOnConfirm = false,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const handleCancel = () => (window.location.hash = '#');
  const showButtons = showCancel || showConfirm;
  const cancelButtonVariant = buttonStyle === 'bcgov' ? 'bcSecondary' : 'secondary';
  const confirmButtonVariant = buttonStyle === 'bcgov' ? 'bcPrimary' : 'primary';

  const handleConfirm = async () => {
    setLoading(true);
    if (onConfirm) await onConfirm();
    setLoading(false);
    if (!skipCloseOnConfirm) window.location.hash = '#';
  };

  return (
    <StyledModal id={id}>
      <Header title={title} as="div">
        {icon && <PaddedIcon icon={icon} title="Information" size="2x" style={{ paddingRight: '10px' }} />}
        {title}
        {closable && (
          <Modal.Close onClick={handleCancel}>
            <FontAwesomeIcon icon={faTimes} size="lg"></FontAwesomeIcon>
          </Modal.Close>
        )}
      </Header>
      <Modal.Content>
        {content}
        {showButtons && (
          <ButtonContainer buttonAlign={buttonAlign}>
            {showCancel && (
              <Button variant={cancelButtonVariant} onClick={handleCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleConfirm} variant={confirmButtonVariant}>
              {loading ? <Loader type="Grid" color="#FFF" height={18} width={50} visible={loading} /> : confirmText}
            </Button>
          </ButtonContainer>
        )}
      </Modal.Content>
    </StyledModal>
  );
};

export default CenteredModal;
