import React, { useState, useContext, useEffect } from 'react';
import Input from '@button-inc/bcgov-theme/Input';
import styled from 'styled-components';
import { Button } from '@bcgov-sso/common-react-components';
import { v4 as uuidv4 } from 'uuid';
import { RequestsContext } from 'pages/my-requests';

import { editTeamName } from 'services/team';
import Loader from 'react-loader-spinner';
import { User, LoggedInUser } from 'interfaces/team';
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
  currentUser: LoggedInUser;
  initialTeamName: string;
}

export interface Errors {
  name?: string;
  members?: string[];
}

const emptyUser: User = {
  idirEmail: '',
  role: 'user',
  id: String(uuidv4()),
};

export default function EditTeamNameForm({ onSubmit, currentUser, initialTeamName }: Props) {
  const { state, dispatch } = useContext(RequestsContext);
  const { teamIdToEdit } = state;

  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>();

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
    window.location.hash = '#';
  };

  const handleEditName = async () => {
    const team = { name: teamName.trim(), id: teamIdToEdit };
    const errors = validateTeam(team);
    if (errors) return setErrors(errors);
    setLoading(true);
    const [, err] = await editTeamName(team);
    if (err) {
      console.error(err);
    }
    await onSubmit();
    setLoading(false);
    window.location.hash = '#';
  };

  return (
    <div>
      <Input label="New Team Name" onChange={handleNameChange} value={teamName} />
      {errors && errors.name && <ErrorText>{errors?.name}</ErrorText>}
      <br />
      <ButtonsContainer>
        <Button variant="secondary" onClick={handleCancel} style={{ marginRight: '20px' }}>
          Cancel
        </Button>
        <Button type="button" onClick={handleEditName}>
          {loading ? <Loader type="Grid" color="#FFF" height={18} width={50} visible={loading} /> : 'Save'}
        </Button>
      </ButtonsContainer>
    </div>
  );
}
