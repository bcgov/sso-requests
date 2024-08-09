import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';
import kebabCase from 'lodash.kebabcase';
import Modal from 'react-bootstrap/Modal';

const StyledModal = styled(Modal)`
  & .pg-modal-main {
    max-width: 700px;
    box-shadow: 5px 5px 10px black;

    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) !important;
  }
  & .modal-content {
    border-radius: 0;
  }
  & .modal-header {
    border-radius: 0;
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
  margin-right: 5px;
  height: 30px;
`;

const ContentContainer = styled.div`
  color: #000;
  cursor: default;
  font-weight: 400;
`;

const ButtonContainer = styled.div<{ buttonAlign: 'default' | 'center' }>`
  margin-top: 20px;
  display: flex;
  justify-content: ${(props) => (props.buttonAlign === 'center' ? 'center;' : 'space-between;')} & button {
    min-width: 150px;
    margin-right: 20px;
    display: inline-block;

    &:disabled {
      cursor: not-allowed;
    }
  }
`;

export type ButtonStyle = 'primary' | 'primary-inverse' | 'secondary' | 'secondary-inverse' | 'danger';

interface Props {
  id?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  openModal?: boolean;
  handleClose?: () => void;
  title: string;
  content: any;
  showCancel?: boolean;
  showConfirm?: boolean;
  confirmText?: string;
  buttonAlign?: 'center' | 'default';
  disableConfirm?: boolean;
  buttonStyle?: ButtonStyle;
  icon?: any;
  closable?: boolean;
  skipCloseOnConfirm?: boolean;
  closeOnBackgroundClick?: boolean;
}

const CenteredModal = ({
  id,
  openModal = false,
  handleClose = () => {},
  title,
  content,
  showCancel = true,
  showConfirm = true,
  buttonAlign = 'default',
  onConfirm,
  disableConfirm = false,
  confirmText = 'Confirm',
  buttonStyle = 'primary',
  icon = faExclamationTriangle,
  skipCloseOnConfirm = false,
  closable,
  closeOnBackgroundClick = true,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const showButtons = showCancel || showConfirm;
  let dataTestId = 'confirm-delete-' + kebabCase(title);
  let dataTestIdCancel = 'cancel-' + kebabCase(title);

  const handleConfirm = async () => {
    setLoading(true);
    if (onConfirm) await onConfirm();
    setLoading(false);
    if (!skipCloseOnConfirm) handleClose();
  };

  return (
    <StyledModal
      show={openModal}
      onHide={() => {
        handleClose();
      }}
      dialogClassName="pg-modal-main"
      id={id}
      backdrop={closeOnBackgroundClick ? true : 'static'}
    >
      <Header>
        <Modal.Title>
          {icon && <PaddedIcon icon={icon} title="Information" size="2x" style={{ paddingRight: '10px' }} />}
          {title}
        </Modal.Title>
        {closable && <FontAwesomeIcon icon={faTimes} size="lg" onClick={handleClose}></FontAwesomeIcon>}
      </Header>
      <Modal.Body>
        <ContentContainer>{content}</ContentContainer>
        {showButtons && (
          <ButtonContainer buttonAlign={buttonAlign}>
            {showCancel && (
              <button className="secondary" onClick={handleClose} type="button" data-testid={dataTestIdCancel}>
                Cancel
              </button>
            )}
            {showConfirm && (
              <button
                data-testid={dataTestId}
                onClick={handleConfirm}
                className={buttonStyle}
                type="button"
                disabled={disableConfirm}
              >
                {loading ? (
                  <SpinnerGrid color="#FFF" height={18} width={50} wrapperClass="d-block" visible={loading} />
                ) : (
                  confirmText
                )}
              </button>
            )}
          </ButtonContainer>
        )}
      </Modal.Body>
    </StyledModal>
  );
};

export default CenteredModal;
