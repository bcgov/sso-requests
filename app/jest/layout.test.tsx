import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from 'layout/Layout';

const handleLogin = jest.fn();
const handleLogout = jest.fn();

function LayoutComponent() {
  return (
    <Layout session={session} user={null} enableGold={true} onLoginClick={handleLogin} onLogoutClick={handleLogout} />
  );
}

const ROCKET_CHAT_HYPERLINK = 'https://chat.developer.gov.bc.ca/channel/sso';
const PATHFINDER_SSO_HYPERLINK = 'mailto:bcgov.sso@gov.bc.ca';
const DOCUMENTATION_HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki';
const DISCLAIMER_HYPERLINK = 'https://www2.gov.bc.ca/gov/content/home/disclaimer';
const PRIVACY_HYPERLINK = 'https://www2.gov.bc.ca/gov/content/home/privacy';
const ACCESSIBILITY_HYPERLINK = 'https://www2.gov.bc.ca/gov/content/home/accessible-government';
const COPYRIGHT_HYPERLINK = 'https://www2.gov.bc.ca/gov/content/home/copyright';

const session = {
  at_hash: '',
  aud: '',
  auth_time: 1,
  azp: '',
  client_roles: ['sso-admin'],
  display_name: 'display_name',
  email: 'email@gov.bc.ca',
  email_verified: false,
  exp: 1,
  family_name: 'FN',
  given_name: 'GN',
  iat: 1,
  identity_provider: 'idir',
  idir_user_guid: '',
  idir_username: 'username',
  isAdmin: true,
  iss: '',
  jti: '',
  name: 'name',
  nonce: '',
  preferred_username: '',
  roles: ['sso-admin'],
  session_state: '',
  sid: '',
  sub: '',
  typ: 'ID',
};

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    pathname: '',
    query: '',
  })),
}));

jest.mock('layout/BCSans', () => () => <></>);

describe('Layout page', () => {
  it('should match all external links in the layout page', () => {
    render(<LayoutComponent />);

    expect(screen.getByRole('heading', { name: 'Common Hosted Single Sign-on (CSS)' })).toBeInTheDocument();

    const homeLink = screen.getAllByRole('link', { name: 'Home' });
    expect(homeLink[0]).toHaveAttribute('href', '/');
    expect(homeLink[1]).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'My Dashboard' })).toHaveAttribute('href', '/my-dashboard');
    expect(screen.getByRole('link', { name: 'SSO Dashboard' })).toHaveAttribute('href', '/admin-dashboard');
    expect(screen.getByRole('link', { name: 'SSO Reports' })).toHaveAttribute('href', '/admin-reports');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq');

    expect(screen.getByRole('link', { name: 'Rocket Chat' })).toHaveAttribute('href', ROCKET_CHAT_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Pathfinder SSO' })).toHaveAttribute('href', PATHFINDER_SSO_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute('href', DOCUMENTATION_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Disclaimer' })).toHaveAttribute('href', DISCLAIMER_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', PRIVACY_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Accessibility' })).toHaveAttribute('href', ACCESSIBILITY_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Copyright' })).toHaveAttribute('href', COPYRIGHT_HYPERLINK);
  });

  it('testing on the My Profile module', async () => {
    const { asFragment } = render(<LayoutComponent />);

    //Navigation -> MobileMenu
    //expect(asFragment()).toMatchSnapshot();
    //const myProfileModule = screen.getByText('My Profile');
    // fireEvent.click(myProfileModule)
  });

  it('testing on the log out button', () => {
    render(<LayoutComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(handleLogout).toHaveBeenCalled();
  });

  it('testing on the log in button', () => {
    render(
      <Layout session={null} user={null} enableGold={true} onLoginClick={handleLogin} onLogoutClick={handleLogout} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(handleLogin).toHaveBeenCalled();
  });
});
