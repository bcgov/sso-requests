import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from 'pages/index';
import { session } from './utils/helpers';

const handleLogin = jest.fn();
const handleLogout = jest.fn();

const KNOWLEDGE_BASE_HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki';
const ROCKET_CHAT_HYPERLINK = 'https://chat.developer.gov.bc.ca/channel/sso';
const PATHFINDER_SSO_HYPERLINK = 'mailto:bcgov.sso@gov.bc.ca';
const LEARN_MORE_HERE_HYPERLINK =
  'https://github.com/bcgov/sso-keycloak/wiki/Useful-References#imit-identity-standards';
const ROCKETCHAT_HYPERLINK = 'https://chat.developer.gov.bc.ca/channel/sso';
const HELPFUL_DOCUMENTATION_HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki';

describe('Home panel', () => {
  it('testing on the headings, button, external links', () => {
    render(<Home onLoginClick={handleLogin} onLogoutClick={handleLogout} session={session} />);
    screen.getByRole('heading', { name: 'Common Hosted Single Sign-On (CSS) Vision' });
    screen.getByRole('heading', { name: 'About' });
    screen.getByRole('heading', { name: 'Frequently Asked Questions' });
    screen.getByRole('heading', { name: 'Need Help?' });

    fireEvent.click(screen.getByRole('button', { name: 'Request SSO Integration' }));
    expect(handleLogin).toHaveBeenCalled();

    expect(screen.getByRole('link', { name: 'SSO Pathfinder Knowledge Base' })).toHaveAttribute(
      'href',
      KNOWLEDGE_BASE_HYPERLINK,
    );
    expect(screen.getByRole('link', { name: 'Rocket Chat' })).toHaveAttribute('href', ROCKET_CHAT_HYPERLINK);

    const PathfinderSsoLink = screen.getAllByRole('link', { name: 'Pathfinder SSO' });
    expect(PathfinderSsoLink[0]).toHaveAttribute('href', PATHFINDER_SSO_HYPERLINK);
    expect(PathfinderSsoLink[1]).toHaveAttribute('href', PATHFINDER_SSO_HYPERLINK);
    expect(screen.getByRole('link', { name: 'learn more here' })).toHaveAttribute('href', LEARN_MORE_HERE_HYPERLINK);
    expect(screen.getByRole('link', { name: 'RocketChat' })).toHaveAttribute('href', ROCKETCHAT_HYPERLINK);
    expect(screen.getByRole('link', { name: 'helpful documentation' })).toHaveAttribute(
      'href',
      HELPFUL_DOCUMENTATION_HYPERLINK,
    );
  });
});
