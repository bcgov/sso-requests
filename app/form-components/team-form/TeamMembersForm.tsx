import React from 'react';
import Input from '@button-inc/bcgov-theme/Input';
import DefaultDropdown from '@button-inc/bcgov-theme/Dropdown';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import { User, LoggedInUser } from 'interfaces/team';
import ErrorText from 'components/ErrorText';
import { Errors } from './CreateTeamForm';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  margin-bottom: 10px;
  grid-gap: 0 1em;
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
  align-items: start;
  margin-bottom: 20px;
`;

const Icon = styled(FontAwesomeIcon)`
  align-self: center;
  color: red;
  cursor: pointer;
`;

interface Props {
  errors?: Errors | null;
  members: User[];
  setMembers: Function;
  allowDelete?: boolean;
  currentUser: LoggedInUser | null;
}

export default function TeamForm({ errors, members, setMembers, allowDelete = true, currentUser = null }: Props) {
  const handleAddMember = () => {
    setMembers([
      ...members,
      {
        idirEmail: '',
        role: 'user',
        id: String(uuidv4()),
        pending: true,
      },
    ]);
  };

  const handleEmailChange = (index: number, e: any) => {
    const newMember: User = { ...members[index] };
    newMember.idirEmail = e.target.value;
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

  return (
    <div>
      <p>
        Enter your team member’s email address and they will be sent an invitation to join the project. Once they accept
        the invitation, they will have access to your project. Their invitation will expire in{' '}
        <strong>2 business days</strong>.
      </p>
      <br />

      <p>
        <strong>Roles:</strong>
      </p>
      <p>
        <u>Admin</u>: can manage integrations <strong>and</strong> teams
      </p>
      <p>
        <u>Members</u>: can <strong>only</strong> manage integrations
      </p>

      <MembersSection>
        <Container>
          <strong>Member</strong>
          <strong>Role</strong>
          <Divider />
        </Container>
        {currentUser && (
          <MemberContainer>
            <Input value={currentUser?.email || ''} readOnly />
            <Dropdown label="Role" disabled value={'admin'}>
              <option value="admin">Admin</option>
            </Dropdown>
          </MemberContainer>
        )}
        {members.map((member, i) => (
          <>
            <MemberContainer key={member.id}>
              <div>
                <Input
                  placeholder="Enter email address"
                  onChange={(e: any) => handleEmailChange(i, e)}
                  value={member.idirEmail}
                />
                {errors && errors.members && errors.members[i] && <ErrorText>{errors.members[i]}</ErrorText>}
              </div>
              <Dropdown label="Role" onChange={(e: any) => handleRoleChange(i, e)} value={member.role}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Dropdown>
              {i !== 0 && allowDelete && (
                <Icon icon={faMinusCircle} onClick={() => handleMemberDelete(i)} title="Delete" />
              )}
            </MemberContainer>
          </>
        ))}
        <AddMemberButton onClick={handleAddMember}>
          <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faPlusCircle} title="Add Item" />
          <span>Add another team member</span>
        </AddMemberButton>
      </MembersSection>
    </div>
  );
}
