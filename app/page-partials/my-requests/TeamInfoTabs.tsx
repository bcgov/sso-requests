import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { RequestTabs } from 'components/RequestTabs';
import Table from 'html-components/Table';
import { RequestsContext } from 'pages/my-requests';
import { Button } from '@bcgov-sso/common-react-components';
import CenteredModal from 'components/CenteredModal';
import TeamMembersForm from 'form-components/team-form/TeamMembersForm';
import { User } from 'interfaces/team';
import { useState, useEffect, useContext } from 'react';
import { addTeamMembers, getTeamMembers } from 'services/team';
import { withBottomAlert } from 'layout/BottomAlert';
import ReactPlaceholder from 'react-placeholder';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

const UnpaddedButton = styled(Button)`
  &&& {
    padding: 0;
    margin: 0;
  }
`;

const addMemberModalId = 'add-member-modal';

export type TabKey = 'members';

interface Errors {
  members: string[];
}

const validateMembers = (members: User[], setErrors: Function) => {
  let errors: Errors = { members: [] };
  members.forEach((member, i) => {
    if (!member.idirEmail) errors.members[i] = 'Please enter an email';
  });
  if (errors.members.length === 0) {
    setErrors(null);
    return null;
  } else {
    setErrors(errors);
    return errors;
  }
};

const emptyMember: User = { idirEmail: '', role: 'user' };

interface Props {
  alert: any;
}

function TeamInfoTabs({ alert }: Props) {
  const { state } = useContext(RequestsContext);
  const { teams, activeTeamId } = state;
  const selectedTeam = teams?.find((team) => team.id === activeTeamId);
  const [members, setMembers] = useState<User[]>([]);
  const [tempMembers, setTempMembers] = useState<User[]>([emptyMember]);
  const [errors, setErrors] = useState<Errors | null>();
  const [loading, setLoading] = useState(false);

  const openModal = () => (window.location.hash = addMemberModalId);

  useEffect(() => {
    const getMembers = async (id?: number) => {
      setLoading(true);
      const result = await getTeamMembers(id);
      const [members, err] = result;
      if (err) {
        console.error(err);
      } else {
        setMembers(members);
      }
      setLoading(false);
    };
    getMembers(activeTeamId);
  }, [activeTeamId]);

  const handleConfirm = async () => {
    const errors = validateMembers(tempMembers, setErrors);
    if (errors) return;
    const [result, err] = await addTeamMembers({ members: tempMembers, id: activeTeamId });
    if (err) {
      console.log(err);
      alert.show({
        variant: 'danger',
        fadeOut: 10000,
        closable: true,
        content: `Failed to add new members. Please ensure the emails you have entered are valid,
        and reach out to the SSO team if the problem persists`,
      });
    } else {
      setMembers([...members, ...tempMembers]);
      setTempMembers([emptyMember]);
      window.location.hash = '';
      alert.show({
        variant: 'success',
        fadeOut: 10000,
        closable: true,
        content: `Invited new members to your team!`,
      });
    }
  };

  if (!selectedTeam) return null;

  return (
    <>
      <RequestTabs activeKey={'members'}>
        <Tab eventKey="members" title="Members">
          <TabWrapper>
            <br />
            <UnpaddedButton variant="plainText" onClick={openModal}>
              + Add new team members
            </UnpaddedButton>
            <ReactPlaceholder type="text" rows={7} ready={!loading} style={{ marginTop: '20px' }}>
              <Table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr>
                      <td>{member.idirEmail}</td>
                      <td>{member.role}</td>
                      <td>{member.pending ? 'pending' : 'active'}</td>
                      <td>hi</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ReactPlaceholder>
          </TabWrapper>
        </Tab>
      </RequestTabs>
      <CenteredModal
        title="Add a New Team Member"
        icon={null}
        id={addMemberModalId}
        content={
          <TeamMembersForm members={tempMembers} setMembers={setTempMembers} allowDelete={false} errors={errors} />
        }
        onConfirm={handleConfirm}
        skipCloseOnConfirm={true}
        buttonStyle="custom"
        closable
      />
    </>
  );
}

export default withBottomAlert(TeamInfoTabs);
