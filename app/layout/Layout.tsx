import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
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

const SubMenu = styled.ul`
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

const GuestRoutes = [
  { path: '/', label: 'About Keycloak' },
  { path: '/terms-conditions', label: 'Terms and Conditions' },
];

const MenuForGuest = ({ currentPath }: { currentPath: string }) => (
  <SubMenu>
    {GuestRoutes.map((route) => {
      return (
        <li className={currentPath === route.path ? 'current' : ''}>
          <Link href={route.path}>
            <a className={currentPath === route.path ? 'current' : ''}>{route.label}</a>
          </Link>
        </li>
      );
    })}
  </SubMenu>
);

const MenuForUser = () => (
  <ul>
    <li>
      <Link href="/my-requests">
        <a>My Requests</a>
      </Link>
    </li>
    <li>
      <Link href="/request">
        <a>Support</a>
      </Link>
    </li>
  </ul>
);

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
        {currentUser ? <MenuForUser /> : <MenuForGuest currentPath={pathname} />}
      </Navigation>
      <MainContent>{children}</MainContent>
      <Footer>
        <ul>
          <li>
            <a href=".">Home</a>
          </li>
          <li>
            <a href=".">Copyright</a>
          </li>
          <li>
            <a href=".">Contact us</a>
          </li>
        </ul>
      </Footer>
    </>
  );
}
export default Layout;
