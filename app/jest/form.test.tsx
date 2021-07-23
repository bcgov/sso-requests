import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FormTemplate from 'form-components/FormTemplate';
import { createRequest, updateRequest } from 'services/request';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('services/request', () => {
  const promise = Promise.resolve;
  return {
    createRequest: jest.fn(),
    updateRequest: jest.fn(() => promise),
  };
});

// Container to expose variables from beforeeach to test functions
let sandbox: any = {};

describe('Form Template', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    const push = jest.fn();
    sandbox.push = push;
    // @ts-ignore
    useRouter.mockImplementation(() => ({
      push,
      pathname: '/',
      route: '/',
      asPath: '/',
      query: '',
    }));
  });

  it('Saves data and triggers spinner on blur events', async () => {
    render(<FormTemplate currentUser={{}} request={true} />);
    const uriInput = document.querySelector('#root_devRedirectUrls_0') as HTMLElement;
    fireEvent.blur(uriInput);
    expect(updateRequest).toHaveBeenCalled();
    const savingLoader = document.querySelector("svg[aria-label='request-saving']");
    expect(savingLoader).not.toBeNull();
    // wait for spinner to change to checkmark
    await waitFor(() => screen.getByTitle('request-saved'));
  });

  it('Saves and advances the form when clicking next', async () => {
    render(<FormTemplate currentUser={{}} request={true} />);
    const nextButton = screen.getByText('Next') as HTMLElement;
    const devRedirectUrls = document.getElementById('root_devRedirectUrls_0') as HTMLElement;
    const testRedirectUrls = document.getElementById('root_testRedirectUrls_0') as HTMLElement;
    const prodRedirectUrls = document.getElementById('root_prodRedirectUrls_0') as HTMLElement;
    fireEvent.change(devRedirectUrls, { target: { value: 'http://localhost' } });
    fireEvent.change(testRedirectUrls, { target: { value: 'http://localhost' } });
    fireEvent.change(prodRedirectUrls, { target: { value: 'http://localhost' } });
    fireEvent.click(nextButton);
    expect(updateRequest).toHaveBeenCalled();
    // Expect next age to load
    await waitFor(() => screen.getByText("We're a Community"));
  });

  it('Redirects to my-requests on cancel', () => {
    render(<FormTemplate currentUser={{}} request={true} />);
    const cancelButton = screen.getByText('Cancel') as HTMLElement;
    fireEvent.click(cancelButton);
    expect(sandbox.push).toHaveBeenCalledWith('/my-requests');
  });
});
