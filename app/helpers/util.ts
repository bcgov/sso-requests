import { UserSession } from '@app/interfaces/props';
import { getTeamMembers } from '@app/services/team';

export const getLoggedInTeamMember = async (teamId: number, currentUser: UserSession) => {
  const teamMembersRes = await getTeamMembers(teamId);
  const [members, err] = teamMembersRes;
  return members.find((member: any) => member?.idirEmail === currentUser.email);
};
