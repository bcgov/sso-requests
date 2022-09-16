import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Select, { MultiValue, ActionMeta } from 'react-select';
import Input from '@button-inc/bcgov-theme/Input';
import styled from 'styled-components';
import forEach from 'lodash.foreach';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { bulkCreateRole } from 'services/keycloak';

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

const FlexBox = styled.div`
  display: flex;
  & > * {
    padding-right: 0.5rem;
  }
`;

const FlexItem = styled.div`
  padding-top: 10px;
  padding-bottom: 10px;
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

interface Failures {
  [key: string]: string[];
}

function CreateRoleContent({ integrationId, environments = ['dev'] }: Props, ref: any) {
  const [submitted, setSubmitted] = useState(false);
  const [failures, setFailures] = useState<Failures>({});
  const [roles, setRoles] = useState<NewRole[]>([emptyRole]);

  useImperativeHandle(ref, () => ({
    submit: async () => {
      // if submitted already, prepare data from the failed ones
      let _roles = roles;
      if (submitted) {
        _roles = [];
        forEach(failures, (envs, role) => {
          _roles.push({ name: role, envs });
        });
      }

      const [results, error] = await bulkCreateRole({ integrationId, roles: _roles });
      const _failures: any = {};
      let hasError = false;

      // display failed ones if exists
      forEach(results, (env) => {
        if (env.failure.length > 0) {
          forEach(env.failure, (role) => {
            if (!_failures[role]) _failures[role] = [];
            _failures[role].push(env.env);
            hasError = true;
          });
        }
      });

      setFailures(_failures);
      setSubmitted(true);
      return hasError;
    },
    reset: () => {
      setRoles([emptyRole]);
      setFailures({});
      setSubmitted(false);
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
                      disabled={submitted}
                      onChange={(event: any) => handleNameChange(index, event.target.value)}
                    />
                  </td>
                  <td className="env">
                    <Select
                      value={role.envs.map((env) => ({ value: env, label: env }))}
                      options={environments.map((env) => ({ value: env, label: env }))}
                      isMulti={true}
                      isDisabled={submitted}
                      placeholder="Select..."
                      noOptionsMessage={() => 'You selected all environments'}
                      onChange={(
                        newValue: MultiValue<{ value: string; label: string }>,
                        actionMeta: ActionMeta<{
                          value: string;
                          label: string;
                        }>,
                      ) => handleRoleChange(index, newValue, actionMeta)}
                      styles={{
                        multiValue: (base, state) => {
                          if (failures[role.name] && failures[role.name].includes(state.children as string)) {
                            return { ...base, backgroundColor: '#F1BFBF' };
                          }

                          return base;
                        },
                      }}
                    />
                  </td>
                  <td>
                    {!submitted && roles.length > 1 && (
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
            {submitted ? (
              <td colSpan={3}>
                <FlexBox>
                  <FlexItem>
                    <FontAwesomeIcon icon={faExclamationCircle} color="#D44331" title="Edit" size="lg" />
                  </FlexItem>
                  <FlexItem>
                    We were unable to save some of your changes.
                    <br />
                    <div className="fw-bold">Please try submitting again.</div>
                  </FlexItem>
                </FlexBox>
              </td>
            ) : (
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
            )}
          </tr>
        </tbody>
      </Table>
    </div>
  );
}

export default forwardRef(CreateRoleContent);
