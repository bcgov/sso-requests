import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faEnvelope, faFileAlt, faUserAlt } from '@fortawesome/free-solid-svg-icons';
import Footer from '@button-inc/bcgov-theme/Footer';
import styled from 'styled-components';
import startCase from 'lodash.startcase';
import isFunction from 'lodash.isfunction';
import Navigation from './Navigation';
import TopAlertProvider, { TopAlert } from './TopAlert';
import UserProfileModal from './UserProfileModal';
import GoldNotificationModal from './GoldNotificationModal';
import { formatWikiURL } from '@app/utils/constants';

const headerPlusFooterHeight = '152px';

const LoggedUser = styled.span`
  display: flex;
  align-items: end;
  font-weight: 700;
`;

const MainContent = styled.div`
  padding: 1rem 0;
  min-height: calc(100vh - ${headerPlusFooterHeight});
`;

const MobileSubMenu = styled.ul`
  padding-left: 2rem;
  padding-right: 2rem;

  li a {
    display: inline-block !important;
    font-size: unset !important;
    padding: 0 !important;
    border-right: none !important;
  }
`;

const SubMenu = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding-left: 2rem;
  padding-right: 2rem;
`;

const SubLeftMenu = styled.ul`
  & a {
    font-size: 1rem !important;
  }

  & a.current {
    font-weight: bold;
  }

  & li.current {
    padding-bottom: 6px;
    border-bottom: none;
    background: linear-gradient(orange, orange) bottom /* left or right or else */ no-repeat;
    background-size: calc(100% - 2rem) 4px;
  }
`;

const SubRightMenu = styled.ul`
  padding-right: 2rem;
`;

const FooterMenu = styled.div`
  padding-left: 2rem;
  padding-right: 2rem;
  ul.text-small a {
    font-size: 0.875rem;
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
  hide?: boolean;
  roles: string[];
}

const routes: Route[] = [
  {
    path: '/',
    label: 'Home',
    roles: [
      'guest',
      'user',
      'sso-admin',
      'bceid-approver',
      'github-approver',
      'bc-services-card-approver',
      'social-approver',
    ],
  },
  { path: '/terms-conditions', label: 'Terms and Conditions', roles: ['guest'] },
  {
    path: '/my-dashboard',
    label: 'My Dashboard',
    roles: ['user', 'sso-admin', 'bceid-approver', 'github-approver', 'bc-services-card-approver', 'social-approver'],
  },
  {
    path: '/admin-dashboard',
    label: 'SSO Dashboard',
    roles: ['sso-admin', 'bceid-approver', 'github-approver', 'bc-services-card-approver', 'social-approver'],
  },
  { path: '/admin-reports', label: 'SSO Reports', roles: ['sso-admin'] },
  {
    path: '/request',
    label: 'Request Details',
    roles: ['user', 'sso-admin', 'bceid-approver', 'github-approver', 'bc-services-card-approver', 'social-approver'],
    hide: true,
  },
  {
    path: '/faq',
    label: 'FAQ',
    roles: [
      'guest',
      'user',
      'sso-admin',
      'bceid-approver',
      'github-approver',
      'bc-services-card-approver',
      'social-approver',
    ],
  },
];

const LeftMenuItems = ({ session, currentPath, query }: { session: any; currentPath: string; query: any }) => {
  let roles = ['guest'];
  if (session) {
    roles = session?.client_roles?.length > 0 ? session.client_roles : ['user'];
  }

  const isCurrent = (path: string) => currentPath === path || currentPath.startsWith(`${path}/`);

  return (
    <>
      {routes
        .filter((route) => route.roles.some((role) => roles.includes(role)) && (!route.hide || isCurrent(route.path)))
        .map((route) => {
          return (
            <li key={route.path} className={isCurrent(route.path) ? 'current' : ''}>
              <Link href={route.path}>{isFunction(route.label) ? route.label(query) : route.label}</Link>
            </li>
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
            <a title="My Profile" data-testid="my-profile-link">
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

function Layout({ children, session, user, onLoginClick, onLogoutClick }: any) {
  const router = useRouter();
  const pathname = router.pathname;

  const rightSide = session ? (
    <LoggedUser>
      <div>
        Welcome {`${session.given_name} ${session.family_name}`}&nbsp;
        {session?.client_roles && session?.client_roles.includes('sso-admin') && (
          <span className="small">(SSO Admin)</span>
        )}
      </div>
      &nbsp;&nbsp;
      <button className="secondary-inverse" onClick={onLogoutClick}>
        Log out
      </button>
    </LoggedUser>
  ) : (
    <button className="secondary-inverse" onClick={onLoginClick}>
      Log in
    </button>
  );

  const MobileMenu = () => (
    <MobileSubMenu>
      <LeftMenuItems session={session} currentPath={pathname} query={router.query} />

      <li>
        Need help?&nbsp;&nbsp;
        <a href="https://chat.developer.gov.bc.ca/" target="_blank" title="Rocket Chat">
          <FontAwesomeIcon size="2x" icon={faCommentDots} />
        </a>
        &nbsp;&nbsp;
        <a href="mailto:bcgov.sso@gov.bc.ca" title="SSO Team">
          <FontAwesomeIcon size="2x" icon={faEnvelope} />
        </a>
        &nbsp;&nbsp;
        <a href={formatWikiURL()} target="_blank" title="Wiki">
          <FontAwesomeIcon size="2x" icon={faFileAlt} />
        </a>
      </li>
      <li>
        {session ? (
          <button className="secondary-inverse" onClick={onLogoutClick}>
            Logout
          </button>
        ) : (
          <button className="secondary-inverse" onClick={onLoginClick}>
            Login with IDIR
          </button>
        )}
      </li>
    </MobileSubMenu>
  );

  return (
    <TopAlertProvider>
      <Navigation
        title={() => <HeaderTitle>Common Hosted Single Sign-on (CSS)</HeaderTitle>}
        rightSide={rightSide}
        mobileMenu={MobileMenu}
        onBannerClick={console.log}
      >
        <SubMenu>
          <SubLeftMenu>
            <LeftMenuItems session={session} currentPath={pathname} query={router.query} />
          </SubLeftMenu>
          <SubRightMenu>
            <RightMenuItems />
          </SubRightMenu>
        </SubMenu>
      </Navigation>
      <MainContent>
        <TopAlert>{children}</TopAlert>
      </MainContent>
      <Footer>
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
      </Footer>
      <GoldNotificationModal />
    </TopAlertProvider>
  );
}
export default Layout;
