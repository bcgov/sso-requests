import { render, screen, fireEvent } from '@testing-library/react';
import Home from 'pages/index';
import { session } from './utils/helpers';
import { docusaurusURL, KEYCLOAK_TEAMS_CHANNEL_URL } from '@app/utils/constants';

const handleLogin = jest.fn();
const handleLogout = jest.fn();

const HELPFUL_DOCUMENTATION_HYPERLINK = docusaurusURL;

describe('Home panel', () => {
  it('testing on the headings, button, external links', () => {
    render(<Home onLoginClick={handleLogin} onLogoutClick={handleLogout} session={session} />);
    screen.getByRole('heading', { name: 'Common Hosted Single Sign-On (CSS)' });
    screen.getByRole('heading', { name: 'About' });
    screen.getByRole('heading', { name: 'Need Help?' });

    fireEvent.click(screen.getByRole('button', { name: 'Request SSO Integration' }));
    expect(handleLogin).toHaveBeenCalled();

    const teamsChannelLink = screen.getAllByRole('link', { name: 'Microsoft Teams Keycloak How-to Channel' });
    expect(teamsChannelLink[0]).toHaveAttribute('href', KEYCLOAK_TEAMS_CHANNEL_URL);
    expect(teamsChannelLink[1]).toHaveAttribute('href', KEYCLOAK_TEAMS_CHANNEL_URL);
    expect(screen.getByRole('link', { name: 'helpful documentation' })).toHaveAttribute(
      'href',
      HELPFUL_DOCUMENTATION_HYPERLINK,
    );
  });
});
