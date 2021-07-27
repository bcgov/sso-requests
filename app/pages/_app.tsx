import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import getConfig from 'next/config';
import type { AppProps } from 'next/app';
import { fetchIssuerConfiguration } from 'utils/provider';
import { getAuthorizationUrl, getAccessToken, refreshSession } from 'utils/openid';
import { verifyToken } from 'utils/jwt';
import { wakeItUp } from 'services/auth';
import { setTokens, getTokens, removeTokens } from 'utils/store';
import Layout from 'layout/Layout';
import PageLoader from 'components/PageLoader';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'styles/globals.css';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { base_path } = publicRuntimeConfig;

const ONE_MIN = 60 * 1000;
const TWO_MIN = 2 * ONE_MIN;

const refreshTokenIfExpiriesSoon = async () => {
  const tokens = getTokens();
  const verifiedIdToken = await verifyToken(tokens.id_token);
  if (verifiedIdToken) {
    const expiesIn = verifiedIdToken.exp * 1000 - Date.now();
    console.log(`Token expiries in ${expiesIn}ms`);

    if (expiesIn < TWO_MIN) {
      console.log(`refreshing Token...`);
      const newTokens = await refreshSession({ refreshToken: tokens.refresh_token });
      const newVerifiedIdToken = await verifyToken(newTokens.id_token);
      if (newVerifiedIdToken) {
        console.log(`Token refreshed successfully.`);
        setTokens(newTokens);
        return newVerifiedIdToken;
      } else {
        console.log(`failed to refresh Token.`);
      }

      return null;
    }
    return verifiedIdToken;
  } else {
    return null;
  }
};

const setTokenInterval = () => {
  // periodically using refresh_token grant flow to get new access token here
  setInterval(refreshTokenIfExpiriesSoon, ONE_MIN);
};

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('app started...');
    async function handleTokens(tokens: any, loginWorkflow: boolean) {
      const verifiedIdToken = await verifyToken(tokens.id_token);
      if (verifiedIdToken) {
        if (loginWorkflow) setTokens(tokens);
        const newVerifiedIdToken = await refreshTokenIfExpiriesSoon();
        setTokenInterval();
        setCurrentUser(newVerifiedIdToken);
        setLoading(false);
        if (loginWorkflow) router.push('/my-requests');
        return null;
      } else {
        removeTokens();
        setCurrentUser(null);
        setLoading(false);
      }
    }

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
          await handleTokens(tokens, true);
        }
        // main entrypoint
        else {
          const tokens = getTokens();
          await handleTokens(tokens, false);
        }
      } catch (err) {
        console.log(err);
        removeTokens();
        setCurrentUser(null);
        setLoading(false);
        setError(err);
      }
    }

    wakeItUp();
    fetchUser();
  }, []);

  const handleLogin = async () => {
    const authUrl = await getAuthorizationUrl({ kc_idp_hint: 'idir' });
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    removeTokens();
    window.location.href = base_path || '/';
  };

  if (loading) return <PageLoader />;

  if (
    [`${base_path}/my-requests`, `${base_path}/request`].some((url) => window.location.pathname.startsWith(url)) &&
    !currentUser
  ) {
    router.push('/');
    return null;
  }
  return (
    <Layout currentUser={currentUser} onLoginClick={handleLogin} onLogoutClick={handleLogout}>
      <Component {...pageProps} currentUser={currentUser} onLoginClick={handleLogin} onLogoutClick={handleLogout} />
    </Layout>
  );
}
export default MyApp;
