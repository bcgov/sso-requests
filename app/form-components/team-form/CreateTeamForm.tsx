import React, { useState } from 'react';
import Input from '@button-inc/bcgov-theme/Input';
import styled from 'styled-components';
import { Button } from '@bcgov-sso/common-react-components';
import { v4 as uuidv4 } from 'uuid';
import { createTeam } from 'services/team';
import Loader from 'react-loader-spinner';
import { User, LoggedInUser } from 'interfaces/team';
import ErrorText from 'components/ErrorText';
import TeamMembersForm from './TeamMembersForm';

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
}

export interface Errors {
  name?: string;
  members?: string[];
}

const emptyUser: User = {
  idirEmail: '',
  role: 'member',
  id: String(uuidv4()),
};

export default function TeamForm({ onSubmit, currentUser }: Props) {
  const [members, setMembers] = useState<User[]>([emptyUser]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>();

  const validateTeam = (team: any) => {
    const errors: any = { members: [] };
    let hasError = false;
    if (!team.name) {
      errors.name = 'Please enter a name';
      hasError = true;
    }
    team.members.forEach((member: User, i: number) => {
      if (!member.idirEmail) {
        errors.members[i] = 'Please enter an email';
        hasError = true;
      }
    });
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

  const handleCreate = async () => {
    const team = { name: teamName, members };
    const errors = validateTeam(team);
    if (errors) return setErrors(errors);
    setLoading(true);
    const [, err] = await createTeam(team);
    if (err) {
      console.error(err);
    }
    await onSubmit();
    setMembers([emptyUser]);
    setTeamName('');
    setLoading(false);
    window.location.hash = '#';
  };

  return (
    <div>
      <Input label="Team Name" onChange={handleNameChange} value={teamName} />
      {errors && errors.name && <ErrorText>{errors?.name}</ErrorText>}
      <br />
      <strong>Team Members</strong>
      <TeamMembersForm errors={errors} members={members} setMembers={setMembers} currentUser={currentUser} />
      <ButtonsContainer>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleCreate}>
          {loading ? <Loader type="Grid" color="#FFF" height={18} width={50} visible={loading} /> : 'Send Invitation'}
        </Button>
      </ButtonsContainer>
    </div>
  );
}
