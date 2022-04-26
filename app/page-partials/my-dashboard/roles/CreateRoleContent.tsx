import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Select, { MultiValue, ActionMeta } from 'react-select';
import Input from '@button-inc/bcgov-theme/Input';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { searchKeycloakUsers, listClientRoles, listUserRoles, bulkCreateRole, KeycloakUser } from 'services/keycloak';

const Table = styled.table`
  .env {
    width: 300px;
  }
`;

const AddNewButton = styled.span`
  margin: 10px 0;
  cursor: pointer;
  & span {
    margin-left: 5px;
  }
`;

const ErrorMessage = styled.div`
  color: #ff0000;
`;

interface Props {
  integrationId: number;
  environments: string[];
}

export interface Errors {
  name?: string;
  members?: string[];
}

interface NewRole {
  name: string;
  envs: string[];
}

const emptyRole: NewRole = {
  name: '',
  envs: ['dev'],
};

function CreateRoleContent({ integrationId, environments = ['dev'] }: Props, ref: any) {
  const [roles, setRoles] = useState<NewRole[]>([emptyRole]);

  useImperativeHandle(ref, () => ({
    submit: async () => {
      await bulkCreateRole({ integrationId, roles });
    },
    reset: () => {
      setRoles([emptyRole]);
    },
  }));

  const handleAdd = () => {
    setRoles(roles.concat(emptyRole));
  };

  const handleRemove = (index: number) => {
    setRoles(roles.filter((role, i) => i !== index));
  };

  const handleNameChange = (index: number, newValue: string) => {
    const newRoles = roles.map((role, i) => {
      if (i === index) return { name: newValue, envs: role.envs };
      else return role;
    });

    setRoles(newRoles);
  };

  const handleRoleChange = async (
    index: number,
    newValue: MultiValue<{ value: string; label: string }>,
    actionMeta: ActionMeta<{
      value: string;
      label: string;
    }>,
  ) => {
    const newRoles = roles.map((role, i) => {
      if (i === index) return { name: role.name, envs: newValue.map((v) => v.value) };
      else return role;
    });

    setRoles(newRoles);
  };

  return (
    <div>
      <Table>
        <thead>
          <tr>
            <th className="role">Role Name</th>
            <th className="env">Environments</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {roles.length > 0 ? (
            roles.map((role, index) => {
              return (
                <tr>
                  <td className="role">
                    <Input
                      size="small"
                      minLength="2"
                      maxLength="100"
                      value={role.name}
                      onChange={(event: any) => handleNameChange(index, event.target.value)}
                    />
                  </td>
                  <td className="env">
                    <Select
                      value={role.envs.map((env) => ({ value: env, label: env }))}
                      options={environments.map((env) => ({ value: env, label: env }))}
                      isMulti={true}
                      placeholder="Select..."
                      noOptionsMessage={() => 'You selected all environments'}
                      onChange={(
                        newValue: MultiValue<{ value: string; label: string }>,
                        actionMeta: ActionMeta<{
                          value: string;
                          label: string;
                        }>,
                      ) => handleRoleChange(index, newValue, actionMeta)}
                    />
                  </td>
                  <td>
                    {roles.length > 1 && (
                      <AddNewButton onClick={() => handleRemove(index)}>
                        <FontAwesomeIcon style={{ color: '#FF0303' }} icon={faMinusCircle} title="Remove Role" />
                      </AddNewButton>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3}>No roles added.</td>
            </tr>
          )}
          <tr>
            <td colSpan={3}>
              {roles.length < 20 ? (
                <AddNewButton onClick={handleAdd}>
                  <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faPlusCircle} title="Add Role" />
                  <span>Add another role</span>
                </AddNewButton>
              ) : (
                <ErrorMessage>
                  You can only create 20 roles at a time. Please save before creating any new roles.
                </ErrorMessage>
              )}
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}

export default forwardRef(CreateRoleContent);
