import React, { useState, useContext } from 'react';
import Input from '@button-inc/bcgov-theme/Input';
import styled from 'styled-components';
import { Button } from '@bcgov-sso/common-react-components';
import { createTeam } from 'services/team';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { User, LoggedInUser } from 'interfaces/team';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import ErrorText from 'components/ErrorText';
import TeamMembersForm, { Errors, validateTeam } from 'form-components/team-form/TeamMembersForm';
import { SessionContext, SessionContextInterface } from 'pages/_app';

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  & button {
    min-width: 180px;
  }
`;

interface Props {
  onSubmit: (teamId: number) => void;
  alert: TopAlert;
  setOpenCreateTeamModal: (flag: boolean) => void;
}

const emptyUser: User = {
  idirEmail: '',
  role: 'member',
  id: new Date().getTime(),
};

function CreateTeamForm({ onSubmit, alert, setOpenCreateTeamModal }: Props) {
  const context = useContext<SessionContextInterface | null>(SessionContext);
  const { session } = context || {};

  const [members, setMembers] = useState<User[]>([emptyUser]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors | null>(null);

  const handleNameChange = (e: any) => {
    setTeamName(e.target.value);
  };

  const handleCancel = () => {
    setMembers([emptyUser]);
    setTeamName('');
    setLoading(false);
    setErrors(null);
    setOpenCreateTeamModal(false);
  };

  const handleCreate = async () => {
    const adminUser = session as LoggedInUser;
    const team = { name: teamName, members };
    const [hasError, errors] = validateTeam(team, adminUser.email as string);
    if (hasError) return setErrors(errors);

    setLoading(true);
    const [data, err] = await createTeam(team);
    if (err) {
      alert.show({
        variant: 'danger',
        fadeOut: 10000,
        closable: true,
        content: 'Failed to create team. Please try again.',
      });
    } else {
      alert.show({
        variant: 'success',
        fadeOut: 10000,
        closable: true,
        content: `Team ${teamName} successfully created`,
      });
    }
    if (data) await onSubmit(data.id);
    setMembers([emptyUser]);
    setTeamName('');
    setLoading(false);
    setErrors(null);
    setOpenCreateTeamModal(false);
  };

  return (
    <div>
      <Input label="Team Name" onChange={handleNameChange} maxLength="255" data-testid="team-name" value={teamName} />
      {errors && errors.name && <ErrorText>{errors?.name}</ErrorText>}
      <br />
      <strong>Team Members</strong>
      <TeamMembersForm
        errors={errors}
        members={members}
        setMembers={setMembers}
        currentUser={session as LoggedInUser}
      />
      <ButtonsContainer>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleCreate} data-testid="send-invitation">
          {loading ? <SpinnerGrid color="#FFF" height={18} width={50} visible={loading} /> : 'Send Invitation'}
        </Button>
      </ButtonsContainer>
    </div>
  );
}

export default withTopAlert(CreateTeamForm);
