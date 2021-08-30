import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

it('should match the snapshot', () => {
  let { asFragment } = render(<SubmittedStatusIndicator status="pr" updatedAt="2021-01-01" />);
  expect(asFragment()).toMatchSnapshot();

  ({ asFragment } = render(<SubmittedStatusIndicator status="prFailed" updatedAt="2021-01-01" />));
  expect(asFragment()).toMatchSnapshot();
});
