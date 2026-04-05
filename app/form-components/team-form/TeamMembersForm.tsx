import Input from '@app/components/Input';
import styled from 'styled-components';
import validator from 'validator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle, faStar } from '@fortawesome/free-solid-svg-icons';
import { User, LoggedInUser } from 'interfaces/team';
import ErrorText from 'components/ErrorText';
import Link from '@app/components/Link';
import { formatWikiURL } from '@app/utils/constants';
import AsyncSelect from 'react-select/async';
import { SingleValue, components } from 'react-select';
import { throttledIdirSearch } from '@app/utils/users';
import Dropdown from '@app/components/Dropdown';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  margin-bottom: 10px;
  grid-gap: 0 1em;
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
  padding-left: 1em;
`;

const MemberContainer = styled(Container)`
  grid-template-columns: 2.2fr 0.9fr 1.2fr;
  align-items: start;
  margin-bottom: 20px;
  .email-select > .select-inner__control {
    padding: 0.13em 0;
    border: 2px solid #606060;
    visibility: inherit;

    &:focus-within {
      outline: 4px solid #3b99fc !important;
      outline-offset: 2px !important;
    }
  }
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

const memberRoles = [
  {
    label: 'Admin',
    value: 'admin',
  },
  {
    label: 'Member',
    value: 'member',
  },
];

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

  const handleEmailChange = (selected: SingleValue<{ value: string; label: string }>, index: number) => {
    const newMember: User = { ...members[index] };
    newMember.idirEmail = selected?.label.toLowerCase() || '';
    const newMembers = [...members];
    newMembers[index] = newMember;
    setMembers(newMembers);
  };

  const handleRoleChange = (option: any, index: number) => {
    const newMember: User = { ...members[index] };
    newMember.role = option.value;
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
      <div>
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
            <Link external href={formatWikiURL('CSS-App-My-Teams#ive-created-a-team-now-what')}>
              View a detailed breakdown of roles on our wiki page
            </Link>
          </span>
        </div>
      </div>
      <MembersSection>
        <Container>
          <strong>Member</strong>
          <strong>Role</strong>
          <Divider />
        </Container>
        <EmailAddrValidHeader>
          *Please enter email address tied to an IDIR to allow your user to login
        </EmailAddrValidHeader>
        {currentUser && (
          <MemberContainer>
            <Input value={currentUser?.email || ''} readOnly fullWidth />
            <Dropdown
              aria-label="Role"
              value={'admin'}
              options={[
                {
                  label: 'Admin',
                  value: 'admin',
                },
              ]}
              isDisabled
            />
          </MemberContainer>
        )}
        {members.map((member, i) => (
          <MemberContainer key={member.id}>
            <div>
              <AsyncSelect
                loadOptions={throttledIdirSearch}
                onChange={(option: SingleValue<{ value: string; label: string }>) => handleEmailChange(option, i)}
                noOptionsMessage={() => 'Start typing email...'}
                className="email-select"
                menuPlacement="top"
                maxMenuHeight={120}
                classNamePrefix={'select-inner'}
                placeholder={'Enter email address'}
                components={{
                  Input: (props) => <components.Input {...props} data-testid={`team-member-email-input-${i}`} />,
                  MenuList: (props) => (
                    <components.MenuList {...props} data-testid={`team-member-email-select-menu-${i}`} />
                  ),
                }}
              />
              {errors && errors.members && errors.members[i] && <ErrorText>{errors.members[i]}</ErrorText>}
            </div>
            <Dropdown
              aria-label="Role"
              onChange={(val: any) => handleRoleChange(val, i)}
              value={memberRoles.find((role) => role.value === member.role)}
              data-testid="user-role"
              options={memberRoles}
            />
            {i >= 0 && allowDelete && (
              <Icon
                icon={faMinusCircle}
                onClick={() => handleMemberDelete(i)}
                aria-label="Delete"
                data-testid="delete-user-role"
              />
            )}
          </MemberContainer>
        ))}
        <AddMemberButton onClick={handleAddMember}>
          <FontAwesomeIcon
            style={{ color: '#006fc4' }}
            icon={faPlusCircle}
            aria-label="Add Item"
            data-testid="add-user-role"
          />
          <span>Add another team member</span>
        </AddMemberButton>
      </MembersSection>
    </div>
  );
}

export const validateTeam = (team: { name: string; members: User[] }, adminUser: string) => {
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
