import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from 'pages/index';

describe('HomePage', () => {
  it('should render the card heading', () => {
    render(<HomePage currentUser={null} />);
    const login = screen.getByText('Keycloak Vision');
    expect(login).toBeInTheDocument();
  });
});
