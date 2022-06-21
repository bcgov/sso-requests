import SaveMessage from 'form-components/SaveMessage';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

it('should match the snapshot', () => {
  let { asFragment } = render(<SaveMessage saving={true} content="saving" />);
  expect(asFragment()).toMatchSnapshot();

  ({ asFragment } = render(<SaveMessage saving={true} content="saving" variant="error" />));
  expect(asFragment()).toMatchSnapshot();
});
