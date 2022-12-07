import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import startCase from 'lodash.startcase';
import { Integration } from 'interfaces/Request';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import { Button, Tabs, Tab } from '@bcgov-sso/common-react-components';
import CreateRoleContent from './CreateRoleContent';
import { canCreateOrDeleteRoles } from '@app/helpers/permissions';
import RoleEnvironment from './RoleEnvironment';

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

interface Props {
  integration: Integration;
}

const RoleManagement = ({ integration }: Props) => {
  const modalRef = useRef<ModalRef>(emptyRef);
  const [environment, setEnvironment] = useState('dev');
  const [canCreateOrDeleteRole, setCanCreateOrDeleteRole] = useState(false);
  const [updateKey, setUpdateKey] = useState(0);

  useEffect(() => {
    setEnvironment('dev');
    setCanCreateOrDeleteRole(canCreateOrDeleteRoles(integration));
  }, [integration.id]);

  const handleTabSelect = (key: any) => {
    setEnvironment(key);
  };

  const environments = integration?.environments || [];

  return (
    <>
      <TopMargin />
      <Button
        disabled={!canCreateOrDeleteRole}
        size="medium"
        variant="primary"
        onClick={() => {
          modalRef.current.open();
        }}
      >
        + Create a New Role
      </Button>
      <TopMargin />
      <Tabs onChange={handleTabSelect} activeKey={environment} tabBarGutter={30} destroyInactiveTabPane={true}>
        <br />
        {environments.map((env) => (
          <Tab key={env} tab={startCase(env)}>
            <RoleEnvironment key={updateKey} environment={env} integration={integration}></RoleEnvironment>
          </Tab>
        ))}
      </Tabs>
      <GenericModal
        ref={modalRef}
        title="Create New Role"
        icon={null}
        onConfirm={async (contentRef: any) => {
          const [hasError, hasDuplicate] = await contentRef.current.submit();
          if (hasError) {
            modalRef.current.updateConfig({ confirmButtonText: 'Try Again' });
            return false;
          } else if (hasDuplicate) {
            modalRef.current.updateConfig({
              showConfirmButton: false,
              cancelButtonText: 'Close',
              buttonAlign: 'right',
            });
            setUpdateKey((updateKey) => updateKey + 1);
            return false;
          } else {
            await contentRef.current.reset();
            setUpdateKey((updateKey) => updateKey + 1);
          }
        }}
        onCancel={(contentRef: any) => {
          contentRef.current.reset();
        }}
        confirmButtonText="Save"
        confirmButtonVariant="primary"
        cancelButtonVariant="secondary"
        style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        <CreateRoleContent integrationId={integration.id as number} environments={environments} />
      </GenericModal>
    </>
  );
};

export default RoleManagement;
