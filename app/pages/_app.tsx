import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import getConfig from 'next/config';
import type { AppProps } from 'next/app';
import { fetchIssuerConfiguration } from 'utils/provider';
import { getAuthorizationUrl, getAccessToken } from 'utils/openid';
import { verifyToken } from 'utils/jwt';
import { fetchInfo } from 'services/auth';
import Layout from 'layout/Layout';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'styles/globals.css';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { base_path } = publicRuntimeConfig;

const TOKEN_SESSION = 'tokens';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);

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
            setLoading(false);
            router.push('/my-requests');
          }
        }
        // main entrypoint
        else {
          const saveTokens = JSON.parse(sessionStorage.getItem(TOKEN_SESSION) || '');
          const verifiedIdToken = await verifyToken(saveTokens.id_token);

          if (verifiedIdToken) {
            setCurrentUser(verifiedIdToken);
            setLoading(false);
            return null;
          } else {
            sessionStorage.removeItem(TOKEN_SESSION);
            handleLogin();
          }
        }
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  const handleLogin = async () => {
    const authUrl = await getAuthorizationUrl({ kc_idp_hint: 'idir' });
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    sessionStorage.removeItem(TOKEN_SESSION);
    window.location.href = '/';
  };

  const handleInfo = async () => {
    const info = await fetchInfo();
    console.log(info);
  };

  if (loading) return <div>Loading...</div>;

  if (['/my-requests', '/request'].includes(window.location.pathname) && !currentUser) {
    router.push(base_path || '/');
    return null;
  }

  return (
    <Layout currentUser={currentUser} onLoginClick={handleLogin} onLogoutClick={handleLogout}>
      <Component {...pageProps} currentUser={currentUser} />
    </Layout>
  );
}
export default MyApp;
