import React from 'react';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { useRouter } from 'next/router';
import { LoggedInUser } from 'interfaces/team';
import { getAuthorizationUrl } from 'utils/openid';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { sso_redirect_uri } = publicRuntimeConfig;

interface Props {
  currentUser: LoggedInUser;
}

export default function VerifyUser({ currentUser }: Props) {
  const router = useRouter();
  const { message, teamId } = router.query;

  if (message === 'success') {
    if (currentUser) router.push('/my-requests');
    else {
      // Display please login link
    }
  }

  if (currentUser && message === 'success') router.push('/my-requests');

  const handleLogin = async () => {
    sessionStorage.setItem('team_id', (teamId || '') as string);
    const authUrl = await getAuthorizationUrl({ kc_idp_hint: 'idir' });
    window.location.href = authUrl;
  };

  return (
    <>
      <ResponsiveContainer rules={defaultRules}>
        <h1>{message}</h1>
        <button onClick={handleLogin}>Login</button>
      </ResponsiveContainer>
    </>
  );
}
