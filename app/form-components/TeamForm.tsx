import React, { useState } from 'react';
import Input from '@button-inc/bcgov-theme/Input';
import DefaultDropdown from '@button-inc/bcgov-theme/Dropdown';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@bcgov-sso/common-react-components';
import { v4 as uuidv4 } from 'uuid';
import { createTeam } from 'services/team';
import Loader from 'react-loader-spinner';
import { User } from 'interfaces/team';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  margin-bottom: 20px;
  grid-gap: 1em;
`;

const Dropdown = styled(DefaultDropdown)`
  & .pg-select-wrapper {
    height: 44px;
  }
`;

const Divider = styled.div`
  border-bottom: 1px solid black;
  margin: 10px 0;
  grid-column: 1 / 3;
`;

const AddMemberButton = styled.span`
  margin: 10px 0;
  cursor: pointer;

  & span {
    margin-left: 5px;
  }
`;

const MembersSection = styled.section`
  max-height: 50vh;
  overflow-y: scroll;
`;

const MemberContainer = styled(Container)`
  grid-template-columns: 2fr 2fr 1fr;
  align-items: end;
  margin-bottom: 20px;
`;

const Icon = styled(FontAwesomeIcon)`
  align-self: center;
  color: red;
  cursor: pointer;
`;

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
}

export default function TeamForm({ onSubmit }: Props) {
  const [members, setMembers] = useState<User[]>([
    {
      email: '',
      role: 'user',
      id: String(uuidv4()),
    },
  ]);
  const [teamName, setTeamName] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAddMember = () => {
    setMembers([
      ...members,
      {
        email: '',
        role: 'user',
        id: String(uuidv4()),
      },
    ]);
  };

  const handleNameChange = (e: any) => {
    setTeamName(e.target.value);
  };

  const handleEmailChange = (index: number, e: any) => {
    const newMember: User = { ...members[index] };
    newMember.email = e.target.value;
    const newMembers = [...members];
    newMembers[index] = newMember;
    setMembers(newMembers);
  };

  const handleRoleChange = (index: number, e: any) => {
    const newMember: User = { ...members[index] };
    newMember.role = e.target.value;
    const newMembers = [...members];
    newMembers[index] = newMember;
    setMembers(newMembers);
  };

  const handleMemberDelete = (index: number) => {
    setMembers(members.filter((_member, i) => i !== index));
  };

  const handleCancel = () => {
    window.location.hash = '#';
  };

  const handleCreate = async () => {
    setLoading(true);
    const [team, err] = await createTeam({ name: teamName });
    await onSubmit();
    setLoading(false);
    window.location.hash = '#';
  };

  return (
    <div>
      <Input label="Team Name" onChange={handleNameChange} />
      <br />
      <strong>Team Members</strong>
      <p>
        Enter your team member’s email address and they will be sent an invitation to join the project. Once they accept
        the invitation, they will have access to your project. Their invitation will expire in{' '}
        <strong>2 business days</strong>.
      </p>
      <br />
      <MembersSection>
        <Container>
          <strong>Member</strong>
          <strong>Role</strong>
          <Divider />
        </Container>
        {members.map((member, i) => (
          <MemberContainer key={member.id}>
            <Input
              placeholder="Enter email address"
              onChange={(e: any) => handleEmailChange(i, e)}
              value={member.email}
            />
            <Dropdown label="Role" onChange={(e: any) => handleRoleChange(i, e)}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </Dropdown>
            {i !== 0 && <Icon icon={faMinusCircle} onClick={() => handleMemberDelete(i)} title="Delete" />}
          </MemberContainer>
        ))}
        <AddMemberButton onClick={handleAddMember}>
          <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faPlusCircle} title="Add Item" />
          <span>Add another team member</span>
        </AddMemberButton>
      </MembersSection>
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
