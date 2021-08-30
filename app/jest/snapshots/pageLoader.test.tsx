import PageLoader from 'components/PageLoader';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

it('should match the snapshot', () => {
  const { asFragment } = render(<PageLoader />);
  expect(asFragment()).toMatchSnapshot();
});
