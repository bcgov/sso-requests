import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import getConfig from 'next/config';
import type { AppContext, AppProps } from 'next/app';
import { getProfile, updateProfile } from 'services/user';
import Layout from 'layout/Layout';
import PageLoader from 'components/PageLoader';
import { User, UserSurveyInformation } from 'interfaces/team';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'styles/globals.css';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import '@bcgov/bc-sans/css/BCSans.css';
import SurveyBox from '@app/components/SurveyBox';
import { KeycloakTokenParsed } from 'keycloak-js';
import keycloak from '@app/utils/keycloak';
import App from 'next/app';
import { SessionContext, SurveyContext } from '@app/utils/context';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { base_path, maintenance_mode, sso_redirect_uri, app_url } = publicRuntimeConfig;

const authenticatedUris = [`${base_path}/my-dashboard`, `${base_path}/request`, `${base_path}/admin-dashboard`];

const proccessSession = (session?: KeycloakTokenParsed | null) => {
  if (!session) return null;

  session.roles = session.client_roles;
  session.isAdmin = session?.client_roles?.includes('sso-admin');
  return session;
};

const defaultUserSurveys: UserSurveyInformation = {
  addUserToRole: false,
  createIntegration: false,
  createRole: false,
  cssApiRequest: false,
  viewMetrics: false,
  downloadLogs: false,
};

const refreshTokenPromptTime = 300; // 5 minutes

function MyApp({ Component, pageProps }: AppProps) {
  const sessionExpiringModalRef = useRef<ModalRef>(emptyRef);
  const router = useRouter();
  const [session, setSession] = useState<KeycloakTokenParsed | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [surveyTriggerEvent, setSurveyTriggerEvent] = useState<keyof UserSurveyInformation | null>(null);
  const [displaySurvey, setDisplaySurvey] = useState(false);
  const [openSurvey, setOpenSurvey] = useState(false);
  const [refreshTokenStatus, setRefreshTokenStatus] = useState<'fresh' | 'expiring' | 'expired'>('fresh');

  // Effect to check token age, and show user the appropriate modal if their refresh token is expiring/expired
  useEffect(() => {
    const interval = setInterval(() => {
      if (!session || !keycloak.refreshTokenParsed?.exp) return;
      const now = new Date().getTime() / 1000;
      const secondsToTokenExpiry = keycloak.refreshTokenParsed?.exp - now;
      if (secondsToTokenExpiry > 0 && secondsToTokenExpiry < refreshTokenPromptTime) {
        setRefreshTokenStatus('expiring');
        sessionExpiringModalRef.current.updateConfig({
          confirmButtonText: 'Continue',
          cancelButtonText: 'Logout',
        });
        sessionExpiringModalRef.current.open();
      } else if (secondsToTokenExpiry <= 0) {
        sessionExpiringModalRef.current.updateConfig({
          confirmButtonText: 'Login',
          cancelButtonText: 'Cancel',
        });
        sessionExpiringModalRef.current.open();
        setRefreshTokenStatus('expired');
        setSession(null);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [session]);

  const setShowSurvey = async (show: boolean, triggerEvent: keyof UserSurveyInformation) => {
    if (!user) return;

    // Update user's profile if this is the first time they're being prompted.
    const userHasTriggered = user.surveySubmissions?.[triggerEvent];
    if (!userHasTriggered) {
      const surveySubmissions = { ...defaultUserSurveys, ...user.surveySubmissions, [triggerEvent]: true };
      const [_res, _err] = await updateProfile({ surveySubmissions });
      setUser({ ...user, surveySubmissions });
      setDisplaySurvey(show);
      setOpenSurvey(show);
      setSurveyTriggerEvent(triggerEvent);
    }
  };

  useEffect(() => {
    if (maintenance_mode && maintenance_mode === 'true') {
      router.push({
        pathname: '/application-error',
        query: {
          error: 'maintenance',
        },
      });
    }

    if (!keycloak.didInitialize) {
      keycloak
        .init({
          redirectUri: sso_redirect_uri,
          onLoad: 'check-sso',
        })
        .then(() => {
          const processedSession = proccessSession(keycloak.idTokenParsed);
          setSession(processedSession);
        })
        .catch((err: Error) => console.error(err))
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const [data, err] = await getProfile();
      setUser(data);
    };

    if (session) getUser();
  }, [session]);

  const handleLogin = async () => keycloak.login({ redirectUri: `${app_url}/my-dashboard` });
  const handleLogout = async () => keycloak.logout({ redirectUri: app_url });

  const sessionContext = useMemo(() => ({ session, user, keycloak }), [session, user, keycloak]);
  const surveyContext = useMemo(() => ({ setShowSurvey }), [user]);

  if (loading) return <PageLoader />;

  if (authenticatedUris.some((url) => window.location.pathname.startsWith(url)) && !keycloak.authenticated) {
    router.push('/');
    return null;
  }

  return (
    <SessionContext.Provider value={sessionContext}>
      <SurveyContext.Provider value={surveyContext}>
        {maintenance_mode && maintenance_mode === 'true' ? (
          <Component {...pageProps} />
        ) : (
          <>
            <Layout session={session} user={user} onLoginClick={handleLogin} onLogoutClick={handleLogout}>
              <Head>
                <html lang="en" />
                <title>Common Hosted Single Sign-on (CSS)</title>
                <link rel="icon" href="/bcid-favicon-32x32.png" />
              </Head>
              <Component {...pageProps} session={session} onLoginClick={handleLogin} onLogoutClick={handleLogout} />
            </Layout>
            <GenericModal
              ref={sessionExpiringModalRef}
              style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
              title={refreshTokenStatus === 'expired' ? 'Session Expired' : 'Session Expiring'}
              icon={faExclamationTriangle}
              onConfirm={() => {
                if (refreshTokenStatus === 'expired') handleLogin();
                else if (refreshTokenStatus === 'expiring') keycloak.updateToken();
              }}
              onCancel={() => {
                if (refreshTokenStatus === 'expired') router.push('/');
                else if (refreshTokenStatus === 'expiring') handleLogout();
              }}
              confirmButtonVariant="primary"
              cancelButtonVariant="secondary"
              showConfirmButton={true}
              showCancelButton={true}
            >
              <div>
                <div>Your session {refreshTokenStatus === 'expired' ? 'has expired' : 'will soon expire'}.</div>
                <br />
                <div>Do you want to {refreshTokenStatus === 'expired' ? 'sign back in' : 'continue'}?</div>{' '}
              </div>
            </GenericModal>
            {user && (
              <SurveyBox
                setOpenSurvey={setOpenSurvey}
                open={openSurvey}
                display={displaySurvey}
                setDisplaySurvey={setDisplaySurvey}
                triggerEvent={surveyTriggerEvent}
              />
            )}
          </>
        )}
      </SurveyContext.Provider>
    </SessionContext.Provider>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  const { publicRuntimeConfig = {} } = getConfig() || {};
  return {
    ...appProps,
    pageProps: {
      ...appProps.pageProps,
    },
  };
};

export default MyApp;
