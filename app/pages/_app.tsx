import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import getConfig from 'next/config';
import type { AppProps } from 'next/app';
import { fetchIssuerConfiguration } from 'utils/provider';
import { getAuthorizationUrl, getAccessToken, getEndSessionUrl } from 'utils/openid';
import { verifyToken } from 'utils/jwt';
import { wakeItUp } from 'services/auth';
import { setTokens, getTokens, removeTokens } from 'utils/store';
import Layout from 'layout/Layout';
import PageLoader from 'components/PageLoader';
import Head from 'next/head';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'styles/globals.css';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { base_path } = publicRuntimeConfig;

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<any>(null);

  useEffect(() => {
    console.log('app started...');
    async function handleTokens(tokens: any, loginWorkflow: boolean) {
      const verifiedIdToken = await verifyToken(tokens.id_token);
      if (verifiedIdToken) {
        if (loginWorkflow) {
          setTokens(tokens);
          await router.push('/my-requests');
        }
        setCurrentUser(verifiedIdToken);
      } else {
        removeTokens();
        setCurrentUser(null);
        if (loginWorkflow) {
          router.push({
            pathname: '/application-error',
            query: {
              error: 'E02',
            },
          });
        }
      }
      setLoading(false);
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
    window.location.href = getEndSessionUrl();
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
      <Head>
        <html lang="en" />
        <title>Common Hosted Single Sign-on (CSS)</title>
      </Head>
      <Component {...pageProps} currentUser={currentUser} onLoginClick={handleLogin} onLogoutClick={handleLogout} />
    </Layout>
  );
}
export default MyApp;
