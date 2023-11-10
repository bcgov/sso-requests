import React, { CSSProperties, useState } from 'react';
import Modal from '@button-inc/bcgov-theme/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@bcgov-sso/common-react-components';
import kebabCase from 'lodash/kebabCase';

const StyledModal = styled(Modal)`
  display: flex;
  align-items: center;
  text-align: left !important;

  & .pg-modal-main {
    max-width: 700px;
    margin: auto;
    box-shadow: 5px 5px 10px black;
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
  }
`;

export type ButtonStyle = 'bcgov' | 'custom' | 'danger';

interface Props {
  onConfirm?: () => void;
  onClose?: () => void;
  content: any;
  icon?: any;
  id: string;
  title?: string;
  closable?: boolean;
  showCancel?: boolean;
  showConfirm?: boolean;
  confirmText?: string;
  buttonStyle?: ButtonStyle;
  buttonAlign?: 'center' | 'default';
  skipCloseOnConfirm?: boolean;
  style?: CSSProperties;
}

const CenteredModal = ({
  onConfirm,
  onClose,
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
  style = {},
}: Props) => {
  const [loading, setLoading] = useState(false);
  const showButtons = showCancel || showConfirm;
  let cancelButtonVariant = 'bcSecondary';
  let confirmButtonVariant = 'bcPrimary';
  let dataTestId = 'confirm-delete' + kebabCase(title);
  let dataTestIdCancel = 'cancel' + kebabCase(title);

  switch (buttonStyle) {
    case 'bcgov':
      break;
    case 'custom':
      cancelButtonVariant = 'secondary';
      confirmButtonVariant = 'primary';
      break;
    case 'danger':
      cancelButtonVariant = 'secondary';
      confirmButtonVariant = 'danger';
      break;
  }

  const handleConfirm = async () => {
    setLoading(true);
    if (onConfirm) await onConfirm();
    setLoading(false);
    if (!skipCloseOnConfirm) window.location.hash = '#';
  };

  const handleCancel = async () => {
    if (onClose) onClose();
    window.location.hash = '#';
  };

  return (
    <StyledModal id={id}>
      <Header title={title} as="div">
        {icon && <PaddedIcon icon={icon} title="Information" size="2x" style={{ paddingRight: '10px' }} />}
        {title}
        {closable && (
          <Modal.Close onClick={handleCancel} title="exit">
            <FontAwesomeIcon icon={faTimes} size="lg"></FontAwesomeIcon>
          </Modal.Close>
        )}
      </Header>
      <Modal.Content style={style}>
        <ContentContainer>{content}</ContentContainer>
        {showButtons && (
          <ButtonContainer buttonAlign={buttonAlign}>
            {showCancel && (
              <Button variant={cancelButtonVariant} onClick={handleCancel} type="button" data-testid={dataTestIdCancel}>
                Cancel
              </Button>
            )}
            <Button
              data-testid={dataTestId}
              onClick={handleConfirm}
              variant={confirmButtonVariant}
              type="button"
              className="text-center"
            >
              {loading ? (
                <SpinnerGrid color="#FFF" height={18} width={50} wrapperClass="d-block" visible={loading} />
              ) : (
                confirmText
              )}
            </Button>
          </ButtonContainer>
        )}
      </Modal.Content>
    </StyledModal>
  );
};

export default CenteredModal;
