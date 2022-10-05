import React, { useState, useEffect } from 'react';
import VerticalLayout from 'page-partials/my-dashboard/VerticalLayout';
import TeamInfoTabs from 'page-partials/my-dashboard/TeamInfoTabs';
import TeamList from 'page-partials/my-dashboard/TeamList';
import { getMyTeams } from 'services/team';
import { PageProps } from 'interfaces/props';
import { Team } from 'interfaces/team';

function MyTeams({ session }: PageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const loadTeams = async () => {
    setLoading(true);
    const [teams, err] = await getMyTeams();
    setHasError(!!err);
    setTeams(teams || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  return (
    <VerticalLayout
      tab="teams"
      leftPanel={() => (
        <TeamList
          currentUser={session}
          setTeam={setTeam}
          loading={loading}
          teams={teams}
          loadTeams={loadTeams}
          hasError={hasError}
        />
      )}
      rightPanel={() => team && <TeamInfoTabs team={team} currentUser={session} loadTeams={loadTeams} />}
    />
  );
}

export default MyTeams;
