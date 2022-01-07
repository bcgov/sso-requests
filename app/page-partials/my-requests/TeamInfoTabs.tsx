import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { Team } from 'interfaces/team';
import { RequestTabs } from 'components/RequestTabs';
import { RequestsContext } from 'pages/my-requests';
import { useContext } from 'react';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

export type TabKey = 'members';

interface Props {
  selectedTeam: Team;
  defaultTabKey: TabKey;
  setActiveKey: Function;
  activeKey: TabKey;
}

function TeamInfoTabs() {
  const { state } = useContext(RequestsContext);
  const { teams, activeTeamId } = state;
  const selectedTeam = teams?.find((team) => team.id === activeTeamId);

  if (!selectedTeam) return null;

  return (
    <>
      <RequestTabs activeKey={'members'}>
        <Tab eventKey="members" title="Members">
          <TabWrapper>HIHIHI</TabWrapper>
        </Tab>
      </RequestTabs>
    </>
  );
}

export default TeamInfoTabs;
