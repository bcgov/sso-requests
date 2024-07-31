import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { LoggedInUser, User, UserSurveyInformation } from 'interfaces/team';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'styles/globals.css';
import { useIdleTimer } from 'react-idle-timer';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import noop from 'lodash.noop';
import { parseJWTPayload } from '@app/utils/helpers';
import SurveyBox from '@app/components/SurveyBox';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { base_path, kc_idp_hint, maintenance_mode } = publicRuntimeConfig;

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
}

const defaultUserSurveys: UserSurveyInformation = {
  addUserToRole: false,
  createIntegration: false,
  createRole: false,
  cssApiRequest: false,
  viewMetrics: false,
  downloadLogs: false,
};

export const SessionContext = React.createContext<SessionContextInterface | null>(null);
export const SurveyContext = React.createContext<{
  setShowSurvey: (show: boolean, eventType: keyof UserSurveyInformation) => void;
} | null>(null);

const idleTimerTimeout = 300_000; // 5 minutes
const promptBeforeIdle = 10_000; // prompt 10 seconds before timeout

function MyApp({ Component, pageProps }: AppProps) {
  const sessionExpiringModalRef = useRef<ModalRef>(emptyRef);
  const sessionExpiredModalRef = useRef<ModalRef>(emptyRef);
  const router = useRouter();
  const [session, setSession] = useState<LoggedInUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<any>(null);
  const [refreshTokenState, setRefreshTokenState] = useState('');
  const [surveyTriggerEvent, setSurveyTriggerEvent] = useState<keyof UserSurveyInformation | null>(null);
  const [displaySurvey, setDisplaySurvey] = useState(false);
  const [openSurvey, setOpenSurvey] = useState(false);

  const onPrompt = () => {
    if (refreshTokenState !== 'expired') {
      sessionExpiringModalRef.current.open();
    }
  };

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

  useIdleTimer({
    onPrompt,
    timeout: idleTimerTimeout,
    promptBeforeIdle,
    throttle: 500,
    disabled: session !== null ? false : true,
  });

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

    if (maintenance_mode && maintenance_mode === 'true') {
      router.push({
        pathname: '/application-error',
        query: {
          error: 'maintenance',
        },
      });
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

  useEffect(() => {
    if (session) {
      const interval = setInterval(async () => {
        const tokenPayload = parseJWTPayload(getTokens().refresh_token);
        if (Date.now() >= tokenPayload?.exp * 1000) {
          setRefreshTokenState('expired');
          sessionExpiringModalRef.current.close();
          sessionExpiredModalRef.current.open();
        } else {
          setRefreshTokenState('');
        }
      }, 5_000);

      return () => {
        clearInterval(interval);
      };
    }
  });

  const handleLogin = async () => {
    const authUrl = await getAuthorizationUrl({ kc_idp_hint });
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    removeTokens();
    window.location.href = getEndSessionUrl();
  };

  const surveyContext = useMemo(() => ({ setShowSurvey }), [user]);

  if (loading) return <PageLoader />;

  if (authenticatedUris.some((url) => window.location.pathname.startsWith(url)) && !session) {
    router.push('/');
    return null;
  }

  return (
    <SessionContext.Provider value={{ session, user }}>
      <SurveyContext.Provider value={surveyContext}>
        {maintenance_mode && maintenance_mode === 'true' ? (
          <Component {...pageProps} />
        ) : (
          <>
            <Layout session={session} user={user} onLoginClick={handleLogin} onLogoutClick={handleLogout}>
              <Head>
                <html lang="en" />
                <title>Common Hosted Single Sign-on (CSS)</title>
                <link rel="icon" href="/bootstrap-theme/dist/images/bcid-favicon-32x32.png" />
              </Head>
              <Component {...pageProps} session={session} onLoginClick={handleLogin} onLogoutClick={handleLogout} />
            </Layout>
            <GenericModal
              ref={sessionExpiringModalRef}
              style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
              title="Session expiring"
              icon={faExclamationTriangle}
              onConfirm={async () => await getProfile()}
              onCancel={() => {
                handleLogout();
              }}
              confirmButtonText="Confirm"
              confirmButtonVariant="primary"
              cancelButtonVariant="secondary"
              showConfirmButton={true}
              showCancelButton={true}
            >
              <div>
                <div>Your session will expire soon and you will be signed out automatically.</div>
                <br />
                <div>Do you want to stay signed in?</div>{' '}
              </div>
            </GenericModal>
            <GenericModal
              ref={sessionExpiredModalRef}
              style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
              title="Session expired"
              icon={faExclamationTriangle}
              onConfirm={() => handleLogin()}
              onCancel={async () => await getProfile()}
              confirmButtonText="Login"
              confirmButtonVariant="primary"
              cancelButtonVariant="secondary"
              showConfirmButton={true}
              showCancelButton={true}
            >
              <div>
                <div>Your session has expired.</div>
                <br />
                <div>Please login again.</div>{' '}
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
export default MyApp;
