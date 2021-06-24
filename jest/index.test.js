import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '@pages/index';

describe('HomePage', () => {
  it('should render the heading', () => {
    render(<HomePage />);
    const heading = screen.getByText('Template');
    expect(heading).toBeInTheDocument();
  });
});
