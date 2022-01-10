import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { RequestTabs } from 'components/RequestTabs';
import Table from 'html-components/Table';
import { RequestsContext } from 'pages/my-requests';
import { useContext } from 'react';
import { Button } from '@bcgov-sso/common-react-components';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';

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

export type TabKey = 'members';

const members = [
  { email: 'jon@button.is', role: 'admin', status: 'active' },
  { email: 'jon@button.is', role: 'admin', status: 'active' },
];

function TeamInfoTabs() {
  const { state } = useContext(RequestsContext);
  const { teams, activeTeamId } = state;
  const selectedTeam = teams?.find((team) => team.id === activeTeamId);

  if (!selectedTeam) return null;

  return (
    <>
      <RequestTabs activeKey={'members'}>
        <Tab eventKey="members" title="Members">
          <TabWrapper>
            <br />
            <UnpaddedButton variant="plainText">+ Add new team members</UnpaddedButton>
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
                {members.map((member: any) => (
                  <tr>
                    <td>{member.email}</td>
                    <td>{member.role}</td>
                    <td>{member.status}</td>
                    <td>hi</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TabWrapper>
        </Tab>
      </RequestTabs>
    </>
  );
}

export default TeamInfoTabs;
