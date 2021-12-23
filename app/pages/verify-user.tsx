import React from 'react';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { useRouter } from 'next/router';
import { LoggedInUser } from 'interfaces/team';
import { getAuthorizationUrl } from 'utils/openid';
import getConfig from 'next/config';
import { Button } from '@bcgov-sso/common-react-components';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { sso_redirect_uri } = publicRuntimeConfig;

interface Props {
  currentUser: LoggedInUser;
}

export default function VerifyUser({ currentUser }: Props) {
  const router = useRouter();
  const { message, teamId } = router.query;
  const validated = message === 'success';

  if (currentUser && validated) router.push('/my-requests');

  const handleLogin = async () => {
    sessionStorage.setItem('team_id', (teamId || '') as string);
    const authUrl = await getAuthorizationUrl({ kc_idp_hint: 'idir' });
    window.location.href = authUrl;
  };

  return (
    <>
      <ResponsiveContainer rules={defaultRules}>
        <h1>{message}</h1>
        {validated && (
          <p>You have successfully joined team # {teamId}. Please click below to login and view your dashboard.</p>
        )}
        <Button onClick={handleLogin} variant="bcPrimary">
          Login
        </Button>
      </ResponsiveContainer>
    </>
  );
}
