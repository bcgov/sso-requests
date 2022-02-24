import React, { useState } from 'react';
import MyDashboardLayout from 'page-partials/my-dashboard/Layout';
import TeamInfoTabs from 'page-partials/my-dashboard/TeamInfoTabs';
import TeamList from 'page-partials/my-dashboard/TeamList';
import { PageProps } from 'interfaces/props';
import { Team } from 'interfaces/team';

function MyIntegrations({ currentUser }: PageProps) {
  const [team, setTeam] = useState<Team | null>(null);

  return (
    <MyDashboardLayout
      tab="teams"
      leftPanel={(state: any, dispatch: any) => (
        <TeamList currentUser={currentUser} setTeam={setTeam} state={state} dispatch={dispatch} />
      )}
      rightPanel={(state: any, dispatch: any) =>
        team && <TeamInfoTabs team={team} currentUser={currentUser} state={state} dispatch={dispatch} />
      }
    />
  );
}

export default MyIntegrations;
