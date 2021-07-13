import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import Button from '@button-inc/bcgov-theme/Button';
import styled from 'styled-components';
import BCSans from './BCSans';
import Navigation from './Navigation';

const LoggedUser = styled.span`
  font-weight: 600;
  font-size: 1.3em;
`;

const Menu = () => (
  <ul>
    <li>
      <Link href="/my-requests">
        <a>My Requests</a>
      </Link>
    </li>
    <li>
      <Link href="/request">
        <a>Make Request</a>
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
        <Menu />
      </Navigation>
      {children}
    </>
  );
}
export default Layout;
