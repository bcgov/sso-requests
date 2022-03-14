import React from 'react';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { useRouter } from 'next/router';
import { LoggedInUser } from 'interfaces/team';
import { getAuthorizationUrl } from 'utils/openid';
import { Button } from '@bcgov-sso/common-react-components';
import ErrorImage from 'svg/ErrorImage';
import Link from 'next/link';

interface Props {
  currentUser: LoggedInUser;
}

const content = (lines: string[]) => (
  <text transform="translate(240 238)" fill="#777" fontSize="16" fontFamily="OpenSans, Open Sans">
    <tspan x="0" y="0">
      {lines[0]}
    </tspan>
    <tspan x="0" y="26">
      {lines[1]}
    </tspan>

    <tspan x="0" y="52">
      You may still
    </tspan>
    <tspan y="52" x="95" fill="#006fc4">
      <Link href="/my-dashboard">
        <a>login to your dashboard</a>
      </Link>
    </tspan>
    <tspan y="52"> to start a new integration</tspan>
    <tspan y="78" x="0">
      request or view existing integrations.{' '}
    </tspan>
    <tspan y="26">.</tspan>
    <tspan x="120" y="104">
      If you need help, contact our SSO support team by
    </tspan>
    <tspan x="120" y="130" fill="#006fc4">
      <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
        Rocket.Chat
      </a>
    </tspan>
    <tspan y="130"> or </tspan>
    <tspan y="130" fill="#006fc4">
      <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer">
        Email us
      </a>
      .
    </tspan>
  </text>
);

export default function VerifyUser({ currentUser }: Props) {
  const router = useRouter();
  const { message, teamId } = router.query;
  const validated = message === 'success';

  if (currentUser && validated) {
    router.push('/my-dashboard');
    return null;
  }

  const handleLogin = async () => {
    sessionStorage.setItem('team_id', (teamId || '') as string);
    const authUrl = await getAuthorizationUrl({ kc_idp_hint: 'idir' });
    window.location.href = authUrl;
  };

  let errorTitle = '';
  let errorContents = ['If you know the team admin, please reach out them, so they'];
  if (!validated) {
    if (message === 'expired') {
      errorTitle = 'This link has expired.';
      errorContents.push('can re-send the invitation.');
    } else {
      errorTitle = 'This link is no longer active.';
      errorContents.push('can invite you back to the team.');
    }
  }

  return (
    <>
      <ResponsiveContainer rules={defaultRules}>
        {validated ? (
          <>
            <p>You have successfully joined team # {teamId}. Please click below to login and view your dashboard.</p>
            <Button onClick={handleLogin} variant="bcPrimary">
              Login
            </Button>
          </>
        ) : (
          <ErrorImage message={errorTitle} isError={false}>
            {content(errorContents)}
          </ErrorImage>
        )}
      </ResponsiveContainer>
    </>
  );
}
