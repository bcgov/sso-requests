import React from 'react';
import Input from '@button-inc/bcgov-theme/Input';
import DefaultDropdown from '@button-inc/bcgov-theme/Dropdown';
import styled from 'styled-components';
import validator from 'validator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle, faStar } from '@fortawesome/free-solid-svg-icons';
import { User, LoggedInUser } from 'interfaces/team';
import ErrorText from 'components/ErrorText';
import Link from '@button-inc/bcgov-theme/Link';

let adminUser = ''; // Save admin user for later form validation.

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

const LightOutlinedStar = styled(FontAwesomeIcon)`
  padding: 3px;
  border-radius: 25px;
  border-style: solid;
  border-color: black;
  border-width: thin;
`;

const DarkOutlinedStar = styled(FontAwesomeIcon)`
  padding: 3px;
  border-radius: 25px;
  border-style: solid;
  border-color: black;
  border-width: thin;
  color: white;
  background-color: black;
`;

const EmailAddrValidHeader = styled.p`
  font-style: italic;
  font-size: 0.95em;
`;

export interface Errors {
  name: string;
  members: string[];
}

interface Props {
  errors?: Errors | null;
  members: User[];
  setMembers: Function;
  allowDelete?: boolean;
  currentUser: LoggedInUser | null;
}

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
        <div>
          <span>
            <DarkOutlinedStar icon={faStar} />
          </span>
          &nbsp;&nbsp;
          <span className="underline" style={{ verticalAlign: 'top' }}>
            Admins
          </span>
          <span style={{ verticalAlign: 'top' }}>
            &nbsp;have <b>managing</b> powers
          </span>
        </div>
        <div>
          <span>
            <LightOutlinedStar icon={faStar} />
          </span>
          &nbsp;&nbsp;
          <span className="underline" style={{ verticalAlign: 'top' }}>
            Members
          </span>
          <span style={{ verticalAlign: 'top' }}>
            &nbsp;have <b>viewing</b> powers
          </span>
        </div>
        <br />
        <div>
          <span className="underline">
            <Link external href="https://github.com/bcgov/sso-keycloak/wiki/CSS-App-My-Teams">
              View a detailed breakdown of roles on our wiki page
            </Link>
          </span>
        </div>
      </p>
      <MembersSection>
        <Container>
          <strong>Member</strong>
          <strong>Role</strong>
          <Divider />
        </Container>
        <EmailAddrValidHeader>
          *Please enter email address tied to and IDIR to allow your user to login
        </EmailAddrValidHeader>
        {currentUser && (
          <MemberContainer>
            <Input value={(adminUser = currentUser?.email || '')} readOnly />
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
                  data-testid="user-email"
                />
                {errors && errors.members && errors.members[i] && <ErrorText>{errors.members[i]}</ErrorText>}
              </div>
              <Dropdown
                label="Role"
                onChange={(e: any) => handleRoleChange(i, e)}
                value={member.role}
                data-testid="user-role"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </Dropdown>
              {i >= 0 && allowDelete && (
                <Icon
                  icon={faMinusCircle}
                  onClick={() => handleMemberDelete(i)}
                  title="Delete"
                  data-testid="delete-user-role"
                />
              )}
            </MemberContainer>
          </>
        ))}
        <AddMemberButton onClick={handleAddMember}>
          <FontAwesomeIcon
            style={{ color: '#006fc4' }}
            icon={faPlusCircle}
            title="Add Item"
            data-testid="add-user-role"
          />
          <span>Add another team member</span>
        </AddMemberButton>
      </MembersSection>
    </div>
  );
}

export const validateTeam = (team: { name: string; members: User[] }) => {
  const errors: any = { name: null, members: [] };

  if (!team.name) {
    errors.name = 'Please enter a name';
  }

  team.members.forEach((member: User, i: number) => {
    if (!member.idirEmail) errors.members[i] = 'Please enter an email';
    else if (!validator.isEmail(member.idirEmail)) errors.members[i] = 'Please enter a valid email';
    else {
      let result = team.members.filter((email) => email.idirEmail === member.idirEmail).length;
      if (result > 1 || member.idirEmail === adminUser) errors.members[i] = 'Please use unique email';
    }
  });

  const hasError = errors.name || errors.members.length > 0;
  return [hasError, errors];
};

export default TeamMembersForm;
