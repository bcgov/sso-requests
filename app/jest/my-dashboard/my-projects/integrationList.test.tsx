import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import { Integration } from 'interfaces/Request';
import noop from 'lodash.noop';
import { getRequests } from 'services/request';
import { sampleRequest } from '../../samples/integrations';

const setIntegration = () => {};
const setIntegrationCount = noop;

const mockClientRolesResult = { ...sampleRequest, serviceType: 'browser_login' };

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ query: {}, push: jest.fn, replace: jest.fn })),
}));

jest.mock('services/request', () => ({
  getRequests: jest.fn(() => Promise.resolve([[mockClientRolesResult], null])),
}));

//updateIntegrations, loadIntegrations

describe('Integration list', () => {
  it('should match the selected integration ID and match the color', async () => {
    // const setLoadingMock = jest.fn();
    // const useLoadingMock: any = (useState: any) => [useState, setLoadingMock];
    // jest.spyOn(React, 'useState').mockImplementation(useLoadingMock);

    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    await expect(getRequests).toHaveBeenCalled();
    //expect(screen.getByText('Reque'));
    screen.logTestingPlaygroundURL();
  });

  it('should match table headers, data, rows and action buttons', async () => {});
});
