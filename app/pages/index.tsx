import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { fetchIssuerConfiguration } from '../utils/provider';
import { getAuthorizationUrl, getAccessToken } from '../utils/openid';
import { verifyToken } from '../utils/jwt';
import { fetchInfo } from '../services/auth';

const TOKEN_SESSION = 'tokens';

export default function Home() {
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
            window.location.href = '/';
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
    window.location.reload();
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
            <button type="button" onClick={handleInfo}>
              Info
            </button>
          </>
        ) : (
          <button type="button" onClick={handleLogin}>
            Login
          </button>
        )}
      </main>

      <footer></footer>
    </>
  );
}
