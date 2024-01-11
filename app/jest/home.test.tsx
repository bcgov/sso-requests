import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from 'pages/index';
import { session } from './utils/helpers';
import { wikiURL } from '@app/utils/constants';

const handleLogin = jest.fn();
const handleLogout = jest.fn();

const KNOWLEDGE_BASE_HYPERLINK = `${wikiURL}`;
const ROCKET_CHAT_HYPERLINK = 'https://chat.developer.gov.bc.ca/channel/sso';
const PATHFINDER_SSO_HYPERLINK = 'mailto:bcgov.sso@gov.bc.ca';
const LEARN_MORE_HERE_HYPERLINK = `${wikiURL}/Useful-References#imit-identity-standards`;
const ROCKETCHAT_HYPERLINK = 'https://chat.developer.gov.bc.ca/channel/sso';
const HELPFUL_DOCUMENTATION_HYPERLINK = `${wikiURL}`;

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
    const rocketChatLink = screen.getAllByRole('link', { name: 'RocketChat' });
    expect(rocketChatLink[0]).toHaveAttribute('href', ROCKET_CHAT_HYPERLINK);

    const PathfinderSsoLink = screen.getByRole('link', { name: 'Pathfinder SSO' });
    expect(PathfinderSsoLink).toHaveAttribute('href', PATHFINDER_SSO_HYPERLINK);
    expect(screen.getByRole('link', { name: 'learn more here' })).toHaveAttribute('href', LEARN_MORE_HERE_HYPERLINK);
    expect(rocketChatLink[1]).toHaveAttribute('href', ROCKETCHAT_HYPERLINK);
    expect(screen.getByRole('link', { name: 'helpful documentation' })).toHaveAttribute(
      'href',
      HELPFUL_DOCUMENTATION_HYPERLINK,
    );
  });
});
