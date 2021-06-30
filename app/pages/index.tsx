import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import getConfig from 'next/config';
import { fetchIssuerConfiguration } from 'utils/provider';
import { getAuthorizationUrl, getAccessToken } from 'utils/openid';
import { verifyToken } from 'utils/jwt';
import { fetchInfo } from 'services/auth';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { app_url } = publicRuntimeConfig;

const TOKEN_SESSION = 'tokens';

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        await fetchIssuerConfiguration();

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state: string = urlParams.get('state') || '';

        // Oauth callback endpoint
        if (code) {
          const tokens = await getAccessToken({ code, state });
          const verifiedIdToken = await verifyToken(tokens.id_token);

          if (verifiedIdToken) {
            sessionStorage.setItem(TOKEN_SESSION, JSON.stringify(tokens));
            setCurrentUser(verifiedIdToken);
            router.push('/');
          }
        }
        // main entrypoint
        else {
          const saveTokens = JSON.parse(sessionStorage.getItem(TOKEN_SESSION) || '');
          const verifiedIdToken = await verifyToken(saveTokens.id_token);

          if (verifiedIdToken) {
            return setCurrentUser(verifiedIdToken);
          } else {
            sessionStorage.removeItem(TOKEN_SESSION);
            handleLogin();
          }
        }
      } catch (err) {
        setError(err);
      }
    }

    fetchUser();
  }, []);

  const handleLogin = async () => {
    const authUrl = await getAuthorizationUrl();
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    sessionStorage.removeItem(TOKEN_SESSION);
    router.reload();
  };

  const handleInfo = async () => {
    const info = await fetchInfo();
    console.log(info);
  };

  return (
    <>
      <Head>
        <title>SSO Requests</title>
        <meta name="description" content="The request process workflow tool for the RedHat SSO Dev Exchange service" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {currentUser ? (
          <>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <button type="button" onClick={handleLogin}>
            Login
          </button>
        )}
        <button type="button" onClick={handleInfo}>
          Check Server Auth
        </button>
      </main>

      <footer></footer>
    </>
  );
}
