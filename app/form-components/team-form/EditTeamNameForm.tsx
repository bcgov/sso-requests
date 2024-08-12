import React, { useState, useEffect } from 'react';
import Input from '@button-inc/bcgov-theme/Input';
import styled from 'styled-components';
import { editTeamName } from 'services/team';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import ErrorText from 'components/ErrorText';

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  & button {
    min-width: 180px;
  }
`;

interface Props {
  onSubmit: Function;
  teamId: number;
  initialTeamName: string;
  setOpenEditTeamModal: (flag: boolean) => void;
}

export interface Errors {
  name?: string;
  members?: string[];
}

export default function EditTeamNameForm({ onSubmit, teamId, initialTeamName, setOpenEditTeamModal }: Props) {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>();
  const [updateTeamNameError, setUpdateTeamNameError] = useState(false);

  useEffect(() => {
    setTeamName(initialTeamName);
  }, [initialTeamName]);

  const validateTeam = (team: any) => {
    const errors: any = { members: [] };
    let hasError = false;
    if (!team.name.trim()) {
      errors.name = 'Please enter a name';
      hasError = true;
    }
    if (hasError) return errors;
    setErrors(undefined);
    return null;
  };

  const handleNameChange = (e: any) => {
    setTeamName(e.target.value);
  };

  const handleCancel = () => {
    setTeamName(initialTeamName);
    setOpenEditTeamModal(false);
  };

  const handleEditName = async () => {
    setUpdateTeamNameError(false);
    const team = { name: teamName.trim(), id: teamId };
    const errors = validateTeam(team);
    if (errors) return setErrors(errors);
    setLoading(true);
    const [, err] = await editTeamName(team);
    if (err) {
      setUpdateTeamNameError(true);
      setLoading(false);
      return;
    }
    await onSubmit();
    setLoading(false);
    setOpenEditTeamModal(false);
  };

  return (
    <div>
      <Input label="New Team Name" onChange={handleNameChange} value={teamName} data-testid="edit-name" />
      {errors && errors.name && <ErrorText>{errors?.name}</ErrorText>}
      {updateTeamNameError && <ErrorText>Failed to update team name</ErrorText>}
      <br />
      <ButtonsContainer>
        <button
          className="secondary"
          onClick={handleCancel}
          style={{ marginRight: '20px' }}
          data-testid="cancel-edit-name"
        >
          Cancel
        </button>
        <button className="primary" type="button" onClick={handleEditName} data-testid="save-edit-name">
          {loading ? <SpinnerGrid color="#FFF" height={18} width={50} visible={loading} /> : 'Save'}
        </button>
      </ButtonsContainer>
    </div>
  );
}
