import { LastSavedMessage } from '@bcgov-sso/common-react-components';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

it('should match the snapshot', () => {
  let { asFragment } = render(<LastSavedMessage saving={true} content="saving" />);
  expect(asFragment()).toMatchSnapshot();

  ({ asFragment } = render(<LastSavedMessage saving={true} content="saving" variant="error" />));
  expect(asFragment()).toMatchSnapshot();
});
