import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Layout from 'layout/Layout';
import { session } from './utils/helpers';
import UserProfileModal from 'layout/UserProfileModal';

const handleLogin = jest.fn();
const handleLogout = jest.fn();
const user = {
  additionalEmail: 'test@gov.bc.ca',
  createdAt: '',
  displayName: 'display_name',
  hasReadGoldNotification: true,
  id: 1,
  idirEmail: 'kuro.chen@gov.bc.ca',
  idirUserid: '',
  integrations: [],
  isAdmin: true,
  updatedAt: '',
};

function LayoutComponent() {
  return (
    <Layout session={session} user={user} enableGold={true} onLoginClick={handleLogin} onLogoutClick={handleLogout} />
  );
}

const ROCKET_CHAT_HYPERLINK = 'https://chat.developer.gov.bc.ca/channel/sso';
const PATHFINDER_SSO_HYPERLINK = 'mailto:bcgov.sso@gov.bc.ca';
const DOCUMENTATION_HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki';
const DISCLAIMER_HYPERLINK = 'https://www2.gov.bc.ca/gov/content/home/disclaimer';
const PRIVACY_HYPERLINK = 'https://www2.gov.bc.ca/gov/content/home/privacy';
const ACCESSIBILITY_HYPERLINK = 'https://www2.gov.bc.ca/gov/content/home/accessible-government';
const COPYRIGHT_HYPERLINK = 'https://www2.gov.bc.ca/gov/content/home/copyright';

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

    //await waitFor(async () => {await screen.findByText('My Profile') });
    const myProfileModule = await screen.findByRole('img', { name: 'My Profile' });
    //fireEvent.click(myProfileModule);
    expect(asFragment()).toMatchSnapshot();
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
