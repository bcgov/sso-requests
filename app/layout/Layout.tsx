import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faEnvelope, faFileAlt, faUserAlt } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';
import Navigation from './Navigation';
import TopAlertProvider, { TopAlert } from './TopAlert';
import UserProfileModal from './UserProfileModal';
import GoldNotificationModal from './GoldNotificationModal';
import { formatWikiURL } from '@app/utils/constants';
import { hasAppPermission, appPermissions } from '@app/utils/authorize';
import Nav from 'react-bootstrap/Nav';
import {
  MAIN_NAV_APP_BAR_BOTTOM_BORDER_COLOR,
  MAIN_NAV_APP_BAR_COLOR,
  NAV_APP_BAR_MENU_ITEM_DIVIDER_COLOR,
  NAV_APP_BAR_TEXT_COLOR,
} from '@app/styles/theme';

const headerPlusFooterHeight = '152px';

const LoggedUser = styled.span`
  display: flex;
  align-items: center;
  font-weight: 700;
  color: ${NAV_APP_BAR_TEXT_COLOR};
  justify-content: end;
`;

const LoginLogoutButton = styled.button`
  white-space: nowrap;
`;

const MainContent = styled.div`
  padding: 1rem 0;
  min-height: calc(100vh - ${headerPlusFooterHeight});
`;

const MobileSubMenu = styled.ul`
  padding-left: 2rem;
  padding-right: 2rem;
  a {
    color: ${NAV_APP_BAR_TEXT_COLOR};
  }
`;

const SubMenu = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding-left: 2rem;
  padding-right: 2rem;
`;

const SubRightMenu = styled.div`
  display: flex;
  gap: 1rem;

  & a {
    color: ${NAV_APP_BAR_TEXT_COLOR};
    border-right: 1px solid ${NAV_APP_BAR_MENU_ITEM_DIVIDER_COLOR};
    font-size: 0.9rem;
    padding-right: 15px;
    padding-top: 8px;
  }
`;

const FooterMenu = styled.div`
  padding: 1px;
  border-top: 2px solid ${MAIN_NAV_APP_BAR_BOTTOM_BORDER_COLOR};
  & ul {
    display: flex;
    gap: 1.5rem;
    list-style-type: none;
    padding-left: 3rem;
  }
  & a {
    color: ${NAV_APP_BAR_TEXT_COLOR};
    border-right: 1px solid ${NAV_APP_BAR_MENU_ITEM_DIVIDER_COLOR};
    font-size: 0.9rem;
    padding-right: 15px;
  }
`;

const HoverItem = styled.li`
  &:hover {
    opacity: 0.8;
  }
`;

const HeaderTitle = styled.span`
  height: 100%;
`;

interface Route {
  path: string;
  label: string | ((query: any) => string);
  private: boolean;
  permission?: string;
}

const routes: Route[] = [
  {
    path: '/',
    label: 'Home',
    private: false,
  },
  {
    path: '/terms-conditions',
    label: 'Terms and Conditions',
    private: true,
    permission: appPermissions.VIEW_TERMS_AND_CONDITIONS,
  },
  {
    path: '/my-dashboard',
    label: 'My Dashboard',
    private: true,
    permission: appPermissions.VIEW_MY_DASHBOARD,
  },
  {
    path: '/admin-dashboard',
    label: 'SSO Dashboard',
    private: true,
    permission: appPermissions.VIEW_ADMIN_DASHBOARD,
  },
  { path: '/admin-reports', label: 'SSO Reports', private: true, permission: appPermissions.DOWNLOAD_ADMIN_REPORTS },
  {
    path: '/faq',
    label: 'FAQ',
    private: false,
  },
];

const LeftMenuItems = ({
  session,
  currentPath,
  query,
  mobileMenu = false,
}: {
  session: any;
  currentPath: string;
  query: any;
  mobileMenu?: boolean;
}) => {
  let roles = ['guest'];
  if (session) {
    roles = session?.client_roles?.length > 0 ? session?.client_roles : ['user'];
  }

  const isCurrent = (path: string) => currentPath === path || currentPath.startsWith(`${path}/`);

  return (
    <>
      {routes.map((route) => {
        const isAllowed = !route.private || hasAppPermission(roles, route.permission || '');

        if (!isAllowed) return null;

        const showDivider = !mobileMenu;
        const label = typeof route.label === 'function' ? route.label(query) : route.label;

        const style = {
          color: NAV_APP_BAR_TEXT_COLOR,
          borderRight: showDivider ? `1px solid ${NAV_APP_BAR_MENU_ITEM_DIVIDER_COLOR}` : '',
          fontWeight: 'normal',
          padding: '1px 15px',
          height: '32px',
          background: mobileMenu ? 'none' : undefined,
        };

        return (
          <Nav.Link key={route.path} as={Link} href={route.path} style={style} active={isCurrent(route.path)}>
            {label}
          </Nav.Link>
        );
      })}
    </>
  );
};

const RightMenuItems = () => (
  <>
    <UserProfileModal>
      {(setOpenProfileModal: (flag: boolean) => void) => {
        return (
          <HoverItem>
            <a title="My Profile" data-testid="my-profile-link" style={{ color: NAV_APP_BAR_TEXT_COLOR }} href="#">
              <FontAwesomeIcon size="2x" icon={faUserAlt} onClick={() => setOpenProfileModal(true)} />
            </a>
          </HoverItem>
        );
      }}
    </UserProfileModal>

    <HoverItem>
      <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat">
        <FontAwesomeIcon size="2x" icon={faCommentDots} />
      </a>
    </HoverItem>
    <HoverItem>
      <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO">
        <FontAwesomeIcon size="2x" icon={faEnvelope} />
      </a>
    </HoverItem>
    <HoverItem>
      <a href={formatWikiURL()} target="_blank" title="Documentation">
        <FontAwesomeIcon size="2x" icon={faFileAlt} />
      </a>
    </HoverItem>
  </>
);

const MobileMenu = ({
  session,
  onLoginClick,
  onLogoutClick,
}: {
  session: any;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}) => {
  const router = useRouter();
  const pathname = router.pathname;
  const containerStyle = {
    color: NAV_APP_BAR_TEXT_COLOR,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '1rem',
  };

  const linksContainerStyle = {
    display: 'flex',
    gap: '1rem',
    padding: '0 1rem',
  };

  const sectionPaddingStyle = {
    paddingLeft: '1rem',
  };

  const helpLinks = [
    {
      href: 'https://chat.developer.gov.bc.ca/channel/sso',
      title: 'Rocket Chat',
      icon: faCommentDots,
    },
    {
      href: 'mailto:bcgov.sso@gov.bc.ca',
      title: 'Email SSO Team',
      icon: faEnvelope,
    },
    {
      href: formatWikiURL(),
      title: 'Documentation',
      icon: faFileAlt,
    },
  ];

  const isLoggedIn = Boolean(session);
  const authHandler = isLoggedIn ? onLogoutClick : onLoginClick;
  const authLabel = isLoggedIn ? 'Logout' : 'Login';
  return (
    <MobileSubMenu>
      <LeftMenuItems session={session} currentPath={pathname} query={router.query} mobileMenu />

      <div style={containerStyle}>
        <div>Need Help?</div>

        <div style={linksContainerStyle}>
          {helpLinks.map(({ href, title, icon }) => (
            <Nav.Link key={title} href={href} target="_blank" title={title}>
              <FontAwesomeIcon size="2x" icon={icon} />
            </Nav.Link>
          ))}
        </div>
      </div>

      <div style={sectionPaddingStyle}>
        <LoginLogoutButton className="secondary-inverse" onClick={authHandler} data-testid="mobile-login-logout-button">
          {authLabel}
        </LoginLogoutButton>
      </div>
    </MobileSubMenu>
  );
};

function Layout({ children, session, user, onLoginClick, onLogoutClick }: any) {
  const router = useRouter();
  const pathname = router.pathname;

  const rightSide = session ? (
    <LoggedUser>
      <div style={{ whiteSpace: 'nowrap' }}>
        Welcome {`${session.given_name} ${session.family_name}`}&nbsp;
        {session?.client_roles && session?.client_roles.includes('sso-admin') && (
          <span className="small">(SSO Admin)</span>
        )}
      </div>
      &nbsp;&nbsp;
      <LoginLogoutButton className="secondary-inverse" onClick={onLogoutClick} data-testid="desktop-logout-button">
        Log out
      </LoginLogoutButton>
    </LoggedUser>
  ) : (
    <LoginLogoutButton className="secondary-inverse" onClick={onLoginClick} data-testid="desktop-login-button">
      Log in
    </LoginLogoutButton>
  );

  return (
    <TopAlertProvider>
      <Navigation
        title={() => <HeaderTitle>Common Hosted Single Sign-on (CSS)</HeaderTitle>}
        rightSide={rightSide}
        mobileMenu={<MobileMenu session={session} onLoginClick={onLoginClick} onLogoutClick={onLogoutClick} />}
        onBannerClick={console.log}
      >
        <SubMenu>
          <div
            style={{
              display: 'flex',
            }}
          >
            <LeftMenuItems session={session} currentPath={pathname} query={router.query} />
          </div>
          <SubRightMenu>
            <RightMenuItems />
          </SubRightMenu>
        </SubMenu>
      </Navigation>
      <MainContent>
        <TopAlert>{children}</TopAlert>
      </MainContent>
      <div style={{ background: MAIN_NAV_APP_BAR_COLOR }}>
        <FooterMenu>
          <ul className="text-small">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <a href="https://www2.gov.bc.ca/gov/content/home/disclaimer" target="_blank" rel="noreferrer">
                Disclaimer
              </a>
            </li>
            <li>
              <a href="https://www2.gov.bc.ca/gov/content/home/privacy" target="_blank" rel="noreferrer">
                Privacy
              </a>
            </li>
            <li>
              <a href="https://www2.gov.bc.ca/gov/content/home/accessible-government" target="_blank" rel="noreferrer">
                Accessibility
              </a>
            </li>
            <li>
              <a href="https://www2.gov.bc.ca/gov/content/home/copyright" target="_blank" rel="noreferrer">
                Copyright
              </a>
            </li>
          </ul>
        </FooterMenu>
      </div>
      <GoldNotificationModal />
    </TopAlertProvider>
  );
}
export default Layout;
