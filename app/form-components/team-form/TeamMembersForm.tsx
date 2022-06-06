import React from 'react';
import Input from '@button-inc/bcgov-theme/Input';
import DefaultDropdown from '@button-inc/bcgov-theme/Dropdown';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
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

const Dropdown = styled(DefaultDropdown)<{ readOnlyRole?: boolean }>`
  & .pg-select-wrapper {
    height: 44px;
    ${(props) => (props.readOnlyRole ? `padding-left:6px;` : ``)}
  }
`;

const Divider = styled.div`
  border-bottom: 1px solid black;
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
  grid-template-columns: 2.2fr 0.9fr 1.2fr;
  align-items: start;
  margin-bottom: 20px;
`;

const Icon = styled(FontAwesomeIcon)`
  align-self: center;
  color: red;
  cursor: pointer;
`;

const EmailAddrValidHeader = styled.p`
  font-style: italic;
  font-size: 0.95em;
`;

interface Props {
  errors?: Errors | null;
  members: User[];
  setMembers: Function;
  allowDelete?: boolean;
  currentUser: LoggedInUser | null;
}

export const isValidGovEmail = (email: string) => {
  try {
    if (email !== email.trim()) return false;
    if (!email.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gov.bc.ca/)) return false;
    return true;
  } catch (err) {
    return false;
  }
};

function TeamMembersForm({ errors, members, setMembers, allowDelete = true, currentUser = null }: Props) {
  const handleAddMember = () => {
    setMembers([
      ...members,
      {
        idirEmail: '',
        role: 'member',
        id: new Date().getTime(),
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
        Enter your team member’s government email address and they will be sent an invitation to join the project. Once
        they accept the invitation, they will have access to your project. Their invitation will expire in{' '}
        <strong>2 business days</strong>.
      </p>
      <p>
        <span className="strong">Roles:</span>
        <br />
        <span className="underline">Admin</span>: can manage integrations <span className="strong">and</span> teams
        <br />
        <span className="underline">Members</span>: can <span className="strong">only</span> manage integrations
      </p>
      <MembersSection>
        <Container>
          <strong>Member</strong>
          <strong>Role</strong>
          <Divider />
        </Container>
        <EmailAddrValidHeader>
          *Please enter a{' '}
          <span className="underline">
            <span className="strong">government email address</span>
          </span>{' '}
          ending in "@gov.bc.ca", to allow your user to login
        </EmailAddrValidHeader>
        {currentUser && (
          <MemberContainer>
            <Input value={currentUser?.email || ''} readOnly />
            <Dropdown label="Role" disabled value={'admin'} readOnlyRole={true}>
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
                <option value="member">Member</option>
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

export default TeamMembersForm;
