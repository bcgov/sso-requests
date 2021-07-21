import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faEnvelope, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import Button from '@button-inc/bcgov-theme/Button';
import Footer from '@button-inc/bcgov-theme/Footer';
import styled from 'styled-components';
import BCSans from './BCSans';
import Navigation from './Navigation';

const LoggedUser = styled.span`
  font-weight: 600;
  font-size: 1.3em;
`;

const MainContent = styled.div`
  padding: 1rem 0;
  min-height: calc(100vh - 70px);
`;

const SubMenu = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding-left: 2rem;
  padding-right: 2rem;
`;

const SubLeftMenu = styled.ul`
  & a.current {
    font-weight: bold;
  }

  & li.current {
    padding-bottom: 6px;
    border-bottom: none;
    background: linear-gradient(orange, orange) bottom /* left or right or else */ no-repeat;
    background-size: 70% 4px;
  }
`;

const SubRightMenu = styled.ul`
  padding-right: 2rem;
`;

const FooterMenu = styled.div`
  padding-left: 2rem;
  padding-right: 2rem;
`;

interface Route {
  path: string;
  label: string;
  user?: boolean;
  hide?: boolean;
}

const routes: Route[] = [
  { path: '/', label: 'About Keycloak' },
  { path: '/terms-conditions', label: 'Terms and Conditions' },
  { path: '/my-requests', label: 'My Projects', user: true },
  { path: '/request', label: 'New Request', user: true, hide: true },
];

const support = (
  <SubRightMenu>
    <li>Need help?</li>
    <li>
      <a href="https://chat.developer.gov.bc.ca/" target="_blank" title="Rocket Chat">
        <FontAwesomeIcon size="2x" icon={faCommentDots} />
      </a>
    </li>
    <li>
      <a href="mailto:Vardhman.Shankar@gov.bc.ca" title="SSO Team">
        <FontAwesomeIcon size="2x" icon={faEnvelope} />
      </a>
    </li>
    <li>
      <a href="https://github.com/bcgov/ocp-sso/wiki" target="_blank" title="Wiki">
        <FontAwesomeIcon size="2x" icon={faFileAlt} />
      </a>
    </li>
  </SubRightMenu>
);

const Menus = ({ currentUser, currentPath }: { currentUser: any; currentPath: string }) => {
  const isLoggedIn = !!currentUser;
  const isCurrent = (path: string) => currentPath === path || currentPath.startsWith(`${path}/`);

  return (
    <SubMenu>
      <SubLeftMenu>
        {routes
          .filter((route) => !!route.user === isLoggedIn && (!route.hide || isCurrent(route.path)))
          .map((route) => {
            return (
              <li key={route.path} className={isCurrent(route.path) ? 'current' : ''}>
                <Link href={route.path}>
                  <a className={isCurrent(route.path) ? 'current' : ''}>{route.label}</a>
                </Link>
              </li>
            );
          })}
      </SubLeftMenu>
      {support}
    </SubMenu>
  );
};

function Layout({ children, currentUser, onLoginClick, onLogoutClick }: any) {
  const router = useRouter();
  const pathname = router.pathname;

  const rightSide = currentUser ? (
    <LoggedUser>
      Welcome {`${currentUser.given_name} ${currentUser.family_name}`}
      &nbsp;&nbsp;
      {/* <FontAwesomeIcon style={{ paddingLeft: '5px', height: '25px' }} icon={faUserCircle} /> */}
      <Button variant="secondary-inverse" size="small" onClick={onLogoutClick}>
        Logout
      </Button>
    </LoggedUser>
  ) : (
    <Button variant="secondary-inverse" size="small" onClick={onLoginClick}>
      Login with IDIR
    </Button>
  );

  return (
    <>
      <BCSans />
      <Navigation title="" rightSide={rightSide} onBannerClick={console.log}>
        <Menus currentUser={currentUser} currentPath={pathname} />
      </Navigation>
      <MainContent>{children}</MainContent>
      <Footer>
        <FooterMenu>
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
            {/* <li>
            <a href=".">Copyright</a>
          </li>
          <li>
            <a href=".">Contact us</a>
          </li> */}
          </ul>
        </FooterMenu>
      </Footer>
    </>
  );
}
export default Layout;
