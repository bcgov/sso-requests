import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Layout from 'layout/Layout';
import { updateProfile } from 'services/user';
import { session } from './utils/helpers';
import { SessionContext } from '@app/utils/context';
import { User } from 'interfaces/team';
import { formatWikiURL } from '@app/utils/constants';

const handleLogin = jest.fn();
const handleLogout = jest.fn();
const user: User = {
  additionalEmail: 'addition_email@gov.bc.ca',
  createdAt: '',
  hasReadGoldNotification: true,
  role: 'admin',
  id: 1,
  idirEmail: 'email@gov.bc.ca',
  idirUserid: '',
  integrations: [],
  updatedAt: '',
  pending: false,
};

function LayoutComponent() {
  return (
    <SessionContext.Provider value={{ session, user }}>
      <Layout session={session} user={user} onLoginClick={handleLogin} onLogoutClick={handleLogout} />
    </SessionContext.Provider>
  );
}

const ROCKET_CHAT_HYPERLINK = 'https://chat.developer.gov.bc.ca/channel/sso';
const PATHFINDER_SSO_HYPERLINK = 'mailto:bcgov.sso@gov.bc.ca';
const DOCUMENTATION_HYPERLINK = formatWikiURL();
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

jest.mock('services/user', () => ({
  getProfile: jest.fn(() =>
    Promise.resolve([
      {
        additionalEmail: 'addition_email@gov.bc.ca',
        displayName: 'display_name',
        hasReadGoldNotification: true,
        id: 1,
        isAdmin: true,
        idirEmail: 'email@gov.bc.ca',
        idirUserid: '',
        integrations: [],
        createdAt: '',
        updatedAt: '',
      },
      null,
    ]),
  ),
  updateProfile: jest.fn(() => Promise.resolve([{}, null])),
}));

describe('Layout page', () => {
  it.only('should match all external links in the layout page', async () => {
    render(<LayoutComponent />);

    expect(screen.getByText('Common Hosted Single Sign-on (CSS)')).toBeInTheDocument();
    const homeLink = screen.getAllByRole('link', { name: 'Home' });
    expect(homeLink[0]).toHaveAttribute('href', '/');
    expect(homeLink[1]).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'My Dashboard' })).toHaveAttribute('href', '/my-dashboard');
    expect(screen.getByRole('link', { name: 'SSO Dashboard' })).toHaveAttribute('href', '/admin-dashboard');
    expect(screen.getByRole('link', { name: 'SSO Reports' })).toHaveAttribute('href', '/admin-reports');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq');

    await waitFor(() => {
      expect(screen.getByTestId('my-profile-link')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Rocket Chat' })).toHaveAttribute('href', ROCKET_CHAT_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Pathfinder SSO' })).toHaveAttribute('href', PATHFINDER_SSO_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute('href', DOCUMENTATION_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Disclaimer' })).toHaveAttribute('href', DISCLAIMER_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', PRIVACY_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Accessibility' })).toHaveAttribute('href', ACCESSIBILITY_HYPERLINK);
    expect(screen.getByRole('link', { name: 'Copyright' })).toHaveAttribute('href', COPYRIGHT_HYPERLINK);
  });

  it.only('testing on the My Profile module', async () => {
    render(<LayoutComponent />);
    fireEvent.click(screen.getByTitle('My Profile').lastChild as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('Default Email')).toBeInTheDocument();
      expect(screen.getByText('Additional Email')).toBeInTheDocument();
    });

    const additionEmailInput = screen.getByTestId('addi-email');
    fireEvent.change(additionEmailInput, { target: { value: 'addition_email@gov.bc.ca' } });
    await waitFor(() => {
      expect(screen.getByTestId('addi-email')).toHaveValue('addition_email@gov.bc.ca');
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalled();
    });
  });

  it('testing on the log out button', () => {
    render(<LayoutComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(handleLogout).toHaveBeenCalled();
  });

  it('testing on the log in button', () => {
    render(<Layout session={null} user={null} onLoginClick={handleLogin} onLogoutClick={handleLogout} />);

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(handleLogin).toHaveBeenCalled();
  });
});
