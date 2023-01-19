import React from 'react';
import styled from 'styled-components';
import map from 'lodash.map';
import omitBy from 'lodash.omitby';
import startCase from 'lodash.startcase';
import isEmpty from 'lodash.isempty';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import GenericModal from 'components/GenericModal';
import { mapKeys } from 'lodash';

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
      <Grid cols={6}>
        <Grid.Row gutter={[]}>
          <Grid.Col span={5}>{children}</Grid.Col>
          <Grid.Col span={1} style={{ textAlign: 'right' }}>
            <FontAwesomeIcon icon={faLock} color="#9F9F9F" size="lg" />
          </Grid.Col>
        </Grid.Row>
      </Grid>
    </Readonly>
  );
};

interface Props {
  modalRef: React.Ref<any>;
}

const UserDetailModal = ({ modalRef }: Props) => {
  return (
    <GenericModal
      ref={modalRef}
      id="additiona-user-info"
      title="Additional User Info"
      icon={null}
      cancelButtonText="Close"
      cancelButtonVariant="primary"
      showConfirmButton={false}
      buttonAlign="right"
      style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
    >
      {(context: { guid: string; attributes: any }) => {
        if (!context) return <></>;

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
                <ReadonlyItem width="200px">{key}</ReadonlyItem>
                <ReadonlyItem width="700px">{val}</ReadonlyItem>
              </ReadonlyContainer>
            ))}
          </div>
        );
      }}
    </GenericModal>
  );
};

export default UserDetailModal;
