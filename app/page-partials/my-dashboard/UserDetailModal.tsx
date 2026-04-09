import React from 'react';
import styled from 'styled-components';
import { map, omitBy, startCase, isEmpty } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import GenericModal, { ModalRef } from 'components/GenericModal';
import { mapKeys } from 'lodash';
import { Col, Row } from 'react-bootstrap';

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const ReadonlyContainer = styled.div`
  display: flex;
  & > div:first-child {
    margin-right: 20px;
  }
`;

const Readonly = styled.div<{ width?: string }>`
  background-color: #f1f1f1;
  margin: 2px 0 2px 0;
  padding: 4px 6px;
  ${(props) => (props.width ? `width: ${props.width};` : `width: 300px;`)}
`;

const ReadonlySubHeader = styled.div<{ width?: string }>`
  font-size: 0.9rem;
  ${(props) => (props.width ? `width: ${props.width};` : `width: 300px;`)}
`;

const ReadonlyItem = ({ children, width }: { children: React.ReactNode; width?: string }) => {
  return (
    <Readonly width={width}>
      <Row>
        <Col>{children}</Col>
        <Col style={{ textAlign: 'right' }}>
          <FontAwesomeIcon icon={faLock} color="#9F9F9F" size="lg" />
        </Col>
      </Row>
    </Readonly>
  );
};

interface Props {
  modalRef: React.RefObject<ModalRef>;
}

const UserDetailModal = ({ modalRef }: Props) => {
  return (
    <GenericModal
      ref={modalRef}
      id="additional-user-info"
      title="Additional User Info"
      icon={null}
      cancelButtonText="Close"
      cancelButtonVariant="primary"
      showConfirmButton={false}
      buttonAlign="right"
      size="lg"
      closable={true}
    >
      {(context: { guid: string; attributes: any }) => {
        if (!context) return <div key={'additional-user-info'}></div>;

        let attributes = omitBy(context.attributes, isEmpty);
        attributes = mapKeys(attributes, function (val, key) {
          return startCase(key);
        });

        return (
          <div>
            <Label>GUID</Label>
            <ReadonlyItem width="400px">{context.guid}</ReadonlyItem>
            <br />
            <Label>Attributes</Label>
            <ReadonlyContainer>
              <ReadonlySubHeader width="200px">Key</ReadonlySubHeader>
              <ReadonlySubHeader width="700px">Value</ReadonlySubHeader>
            </ReadonlyContainer>
            {map(attributes, (val, key) => (
              <ReadonlyContainer>
                <ReadonlyItem width="300px">{key}</ReadonlyItem>
                <ReadonlyItem width="600px">{val}</ReadonlyItem>
              </ReadonlyContainer>
            ))}
          </div>
        );
      }}
    </GenericModal>
  );
};

export default UserDetailModal;
