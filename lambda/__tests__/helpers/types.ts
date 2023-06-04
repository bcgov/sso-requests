export type AuthMock = Promise<{
  idir_userid: string | null;
  email?: string;
  client_roles: string[];
  given_name: string;
  family_name: string;
  bearerToken?: string;
}>;
