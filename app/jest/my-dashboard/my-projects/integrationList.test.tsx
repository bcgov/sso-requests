import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import { Integration } from 'interfaces/Request';
import noop from 'lodash.noop';

const setIntegration = () => {};
const setIntegrationCount = () => {};
//const setIntegrationCount = noop;

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ query: {}, push: jest.fn, replace: jest.fn })),
}));

describe('Integration list', () => {
  it('should match the selected integration ID and match the color', async () => {
    // const setLoadingMock = jest.fn();
    // const useLoadingMock: any = (useState: any) => [useState, setLoadingMock];
    // jest.spyOn(React, 'useState').mockImplementation(useLoadingMock);

    React.useState = jest.fn().mockReturnValueOnce([false, {}]);

    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    //expect(screen.getByText('Request ID'));
    screen.logTestingPlaygroundURL();
  });

  it('should match table headers, data, rows and action buttons', async () => {});
});
