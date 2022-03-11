import React, { useState, useEffect } from 'react';
import MyDashboardLayout from 'page-partials/my-dashboard/Layout';
import TeamInfoTabs from 'page-partials/my-dashboard/TeamInfoTabs';
import TeamList from 'page-partials/my-dashboard/TeamList';
import { getMyTeams, deleteTeam } from 'services/team';
import { PageProps } from 'interfaces/props';
import { Team } from 'interfaces/team';

function MyTeams({ currentUser }: PageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const loadTeams = async () => {
    setLoading(true);
    const [teams, err] = await getMyTeams();
    if (teams) setTeams(teams || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  return (
    <MyDashboardLayout
      tab="teams"
      leftPanel={(state: any, dispatch: any) => (
        <TeamList
          currentUser={currentUser}
          setTeam={setTeam}
          loading={loading}
          teams={teams}
          loadTeams={loadTeams}
          state={state}
          dispatch={dispatch}
        />
      )}
      rightPanel={(state: any, dispatch: any) =>
        team && (
          <TeamInfoTabs team={team} currentUser={currentUser} loadTeams={loadTeams} state={state} dispatch={dispatch} />
        )
      }
    />
  );
}

export default MyTeams;
