import React, { CSSProperties, Children, cloneElement, useState, useImperativeHandle, useRef, forwardRef } from 'react';
import Modal from '@button-inc/bcgov-theme/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { noop } from 'lodash';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@bcgov-sso/common-react-components';

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

const ButtonContainer = styled.div<{ buttonAlign: 'center' | 'right' | 'none' }>`
  min-width: 350px;
  margin-top: 20px;
  display: flex;
  justify-content: ${(props) => (props.buttonAlign === 'none' ? 'space-between;' : `${props.buttonAlign};`)} & button {
    min-width: 150px;
    display: inline-block;
  }
`;

export type ButtonStyle = 'bcgov' | 'custom' | 'danger';
export interface ModalRef {
  open: (context?: any) => void;
  close: () => void;
  updateConfig: (data: any) => void;
  getId: () => any;
}

export const emptyRef: ModalRef = {
  open: noop,
  close: noop,
  updateConfig: noop,
  getId: () => 1,
};

interface Props {
  id?: string;
  title?: string;
  onConfirm?: (ref: any, context: any) => any;
  onCancel?: (ref: any, context: any) => void;
  closable?: boolean;
  children?: React.ReactNode;
  icon?: any;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: string;
  cancelButtonVariant?: string;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  buttonAlign?: 'center' | 'right' | 'none';
  style?: CSSProperties;
}

const GenericModal = (
  {
    id = new Date().getTime().toString(),
    title = '',
    onConfirm = (ref: any, context: any) => true,
    onCancel = noop,
    closable = true,
    children,
    icon = faExclamationTriangle,
    confirmButtonText = 'Confirm',
    cancelButtonText = 'Cancel',
    confirmButtonVariant = 'bcPrimary',
    cancelButtonVariant = 'bcSecondary',
    showConfirmButton = true,
    showCancelButton = true,
    buttonAlign = 'none',
    style = {},
  }: Props,
  ref?: any,
) => {
  const initialConfig = {
    confirmButtonText,
    cancelButtonText,
    confirmButtonVariant,
    cancelButtonVariant,
    showConfirmButton,
    showCancelButton,
    buttonAlign,
  };
  const contentRef = useRef<any>();
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [config, setConfig] = useState<any>(initialConfig);

  useImperativeHandle(ref, () => ({
    open: (context: any) => {
      setContext(context);
      window.location.hash = id;
    },
    close: () => {
      setConfig({ ...initialConfig });
      window.location.hash = '#';
    },
    updateConfig: (data: any) => {
      setConfig({ ...config, ...data });
    },
    getId: () => id,
  }));

  const handleConfirm = async () => {
    setLoading(true);
    const close = await onConfirm(contentRef, context);
    setLoading(false);

    if (close) {
      setConfig({ ...initialConfig });
      window.location.hash = '#';
    }
  };

  const handleCancel = async () => {
    onCancel(contentRef, context);
    setConfig({ ...initialConfig });
    window.location.hash = '#';
  };

  if (typeof children === 'function') {
    children = children(context);
  }

  let _children: any[] = [];
  if (typeof children === 'object') {
    if (Array.isArray(children)) {
      _children = children;
    } else {
      _children.push(children);
    }
  }

  _children = Children.map(_children, (child: any, index) => {
    return cloneElement(child, { ref: contentRef });
  });

  return (
    <StyledModal id={id}>
      <Header title={title} as="div">
        {icon && <PaddedIcon icon={icon} title="Information" size="2x" style={{ paddingRight: '10px' }} />}
        {title}
        {closable && (
          <Modal.Close onClick={handleCancel} title="cancel">
            <FontAwesomeIcon icon={faTimes} size="lg"></FontAwesomeIcon>
          </Modal.Close>
        )}
      </Header>
      <Modal.Content style={style}>
        {_children}
        <ButtonContainer buttonAlign={config.buttonAlign}>
          {config.showCancelButton && (
            <Button variant={config.cancelButtonVariant} onClick={handleCancel} type="button">
              {config.cancelButtonText}
            </Button>
          )}
          {config.showConfirmButton && (
            <Button onClick={handleConfirm} variant={config.confirmButtonVariant} type="button">
              {loading ? (
                <Loader type="Grid" color="#FFF" height={18} width={50} visible={loading} />
              ) : (
                config.confirmButtonText
              )}
            </Button>
          )}
        </ButtonContainer>
      </Modal.Content>
    </StyledModal>
  );
};

export default forwardRef(GenericModal);
