import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '@pages/index';

describe('HomePage', () => {
  it('should render the heading', () => {
    render(<HomePage />);
    const login = screen.getByText('Login');
    expect(login).toBeInTheDocument();
  });
});
