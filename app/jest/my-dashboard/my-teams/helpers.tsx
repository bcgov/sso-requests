import MyTeams from '@app/pages/my-dashboard/teams';

const sampleSession = {
  email: 'admin01@gov.bc.ca',
  isAdmin: true,
};

export function MyTeamsComponent() {
  return <MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />;
}
