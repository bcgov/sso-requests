import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import getConfig from 'next/config';
import type { AppProps } from 'next/app';
import { fetchIssuerConfiguration } from 'utils/provider';
import { getAuthorizationUrl, getAccessToken, getEndSessionUrl, parseCallbackParams } from 'utils/openid';
import { verifyToken } from 'utils/jwt';
import { wakeItUp } from 'services/auth';
import { getProfile, updateProfile } from 'services/user';
import { setTokens, getTokens, removeTokens } from 'utils/store';
import Layout from 'layout/Layout';
import PageLoader from 'components/PageLoader';
import { LoggedInUser, User } from 'interfaces/team';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'styles/globals.css';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { base_path, kc_idp_hint, enable_gold } = publicRuntimeConfig;

const authenticatedUris = [`${base_path}/my-dashboard`, `${base_path}/request`, `${base_path}/admin-dashboard`];

const proccessSession = (session: LoggedInUser | null) => {
  if (!session) return null;

  session.roles = session.client_roles;
  session.isAdmin = session?.client_roles?.includes('sso-admin');
  return session;
};

export interface SessionContextInterface {
  session: LoggedInUser | null;
  user: User | null;
  enableGold: boolean;
}

export const SessionContext = React.createContext<SessionContextInterface | null>(null);

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [session, setSession] = useState<LoggedInUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<any>(null);

  useEffect(() => {
    console.log('app started...');
    async function handleTokens(tokens: any, loginWorkflow: boolean) {
      const [verifiedIdToken, errCode] = await verifyToken(tokens.id_token);
      if (verifiedIdToken) {
        if (loginWorkflow) {
          setTokens(tokens);
          await router.push('/my-dashboard');
        }
        setSession(proccessSession(verifiedIdToken));
      } else {
        removeTokens();
        setSession(proccessSession(null));
        if (loginWorkflow) {
          router.push({
            pathname: '/application-error',
            query: {
              error: errCode,
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

        const { code, state } = parseCallbackParams();

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
        setSession(proccessSession(null));
        setLoading(false);
        setError(err);
      }
    }

    wakeItUp();
    fetchUser();
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const [data, err] = await getProfile();
      setUser(data);
    };

    if (session) getUser();
  }, [session]);

  const handleLogin = async () => {
    const authUrl = await getAuthorizationUrl({ kc_idp_hint });
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    removeTokens();
    window.location.href = getEndSessionUrl();
  };

  if (loading) return <PageLoader />;

  if (authenticatedUris.some((url) => window.location.pathname.startsWith(url)) && !session) {
    router.push('/');
    return null;
  }

  return (
    <SessionContext.Provider value={{ session, user, enableGold: enable_gold }}>
      <Layout
        session={session}
        user={user}
        enableGold={enable_gold}
        onLoginClick={handleLogin}
        onLogoutClick={handleLogout}
      >
        <Head>
          <html lang="en" />
          <title>Common Hosted Single Sign-on (CSS)</title>
        </Head>
        <Component
          {...pageProps}
          session={session}
          enable_gold={enable_gold}
          onLoginClick={handleLogin}
          onLogoutClick={handleLogout}
        />
      </Layout>
    </SessionContext.Provider>
  );
}
export default MyApp;
