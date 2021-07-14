import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import Button from '@button-inc/bcgov-theme/Button';
import Footer from '@button-inc/bcgov-theme/Footer';
import styled from 'styled-components';
import ResponsiveContainer from 'components/ResponsiveContainer';
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

const MenuForGuest = () => (
  <ul>
    <li>
      <Link href="/">
        <a>About Keycloak</a>
      </Link>
    </li>
  </ul>
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
        {currentUser ? <MenuForUser /> : <MenuForGuest />}
      </Navigation>
      <MainContent>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </MainContent>
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
