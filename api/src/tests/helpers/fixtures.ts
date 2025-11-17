export const TEAM_ADMIN_IDIR_USERNAME_01 = 'TEAMADMINIDIRUSER01';
export const TEAM_ADMIN_IDIR_USERID_01 = 'TEAM_ADMIN_IDIR_USER_01';
export const TEAM_ADMIN_IDIR_EMAIL_01 = 'team.admin.idir.user-01@gov.bc.ca';

export const TEAM_ADMIN_IDIR_USERID_02 = 'TEAM_ADMIN_IDIR_USER_02';
export const TEAM_ADMIN_IDIR_EMAIL_02 = 'team.admin.idir.user-02@gov.bc.ca';

export const TEAM_ADMIN_IDIR_USERID_03 = 'TEAM_ADMIN_IDIR_USER_03';
export const TEAM_ADMIN_IDIR_EMAIL_03 = 'team.admin.idir.user-03@gov.bc.ca';
export const TEAM_MEMBER_IDIR_USERID_01 = 'TEAM_MEMBER_IDIR_USER_01';
export const TEAM_MEMBER_IDIR_EMAIL_01 = 'team.member.idir.user-01@gov.bc.ca';

export const TEAM_MEMBER_IDIR_USERID_02 = 'TEAM_MEMBER_IDIR_USER_02';
export const TEAM_MEMBER_IDIR_EMAIL_02 = 'team.member.idir.user-02@gov.bc.ca';

export const postTeamMembers = [
  {
    idirEmail: TEAM_ADMIN_IDIR_EMAIL_02,
    role: 'admin',
  },
  {
    idirEmail: TEAM_ADMIN_IDIR_EMAIL_03,
    role: 'admin',
  },
  {
    idirEmail: TEAM_MEMBER_IDIR_EMAIL_01,
    role: 'member',
  },
  {
    idirEmail: TEAM_MEMBER_IDIR_EMAIL_02,
    role: 'member',
  },
];

export const postTeam = {
  name: 'team_01',
  members: postTeamMembers,
};
