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

function TeamInfoTabs() {
  const { state } = useContext(RequestsContext);
  const { teams, activeTeamId } = state;
  const selectedTeam = teams?.find((team) => team.id === activeTeamId);
  const [members, setMembers] = useState<User[]>([]);
  const [tempMembers, setTempMembers] = useState<User[]>(members);

  const openModal = () => (window.location.hash = addMemberModalId);

  useEffect(() => {
    const getMembers = async (id?: number) => {
      const result = await getTeamMembers(id);
      const [members, err] = result;
      if (err) {
        console.error(err);
      } else {
        setMembers(members);
        setTempMembers(members);
      }
    };
    getMembers(activeTeamId);
  }, [activeTeamId]);

  const handleConfirm = () => {
    setMembers(tempMembers);
    addTeamMembers({ members: tempMembers, id: activeTeamId });
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
          </TabWrapper>
        </Tab>
      </RequestTabs>
      <CenteredModal
        title="Add a New Team Member"
        icon={null}
        id={addMemberModalId}
        content={<TeamMembersForm members={tempMembers} setMembers={setTempMembers} allowDelete={false} />}
        onConfirm={handleConfirm}
        buttonStyle="custom"
        closable
      />
    </>
  );
}

export default TeamInfoTabs;
