import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FormTemplate from 'form-components/FormTemplate';
import { createRequest, updateRequest, getRequest } from 'services/request';
import { Request } from 'interfaces/Request';
import { setUpRouter } from './utils/setup';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('services/request', () => {
  const promise = Promise.resolve;
  return {
    createRequest: jest.fn(),
    updateRequest: jest.fn(() => promise),
    getRequest: jest.fn(),
  };
});

// Container to expose variables from beforeeach to test functions
let sandbox: any = {};

const setUpRender = (request: Request | null) => {
  const { debug } = render(<FormTemplate currentUser={{}} request={request} />);
  sandbox.firstStageBox = screen.getByText('Requester Info').closest('div') as HTMLElement;
  sandbox.secondStageBox = screen.getByText('Providers and URIs').closest('div') as HTMLElement;
  sandbox.thirdStageBox = screen.getByText('Terms and conditions').closest('div') as HTMLElement;
  sandbox.fourthStageBox = screen.getByText('Review & Submit').closest('div') as HTMLElement;
  return debug;
};

const sampleRequest: Request = {
  devValidRedirectUris: ['http://dev1.com', 'http://dev2.com'],
  testValidRedirectUris: ['http://test.com'],
  prodValidRedirectUris: ['http://prod.com'],
  publicAccess: true,
  realm: 'onestopauth',
  projectName: 'test project',
  preferredEmail: 'test@email.com',
  projectLead: true,
  newToSso: true,
  agreeWithTerms: true,
};

describe('Form Template Saving and Navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    setUpRouter('/', sandbox);
    setUpRender({});
  });

  it('Saves data and triggers spinner on blur events', async () => {
    const uriInput = document.querySelector('#root_devValidRedirectUris_0') as HTMLElement;
    fireEvent.blur(uriInput);
    expect(updateRequest).toHaveBeenCalled();
    const savingLoader = document.querySelector("svg[aria-label='request-saving']");
    expect(savingLoader).not.toBeNull();
    // wait for spinner to change to checkmark
    await waitFor(() => screen.getByTitle('request-saved'));
  });

  it('Saves and advances the form when clicking next', async () => {
    const nextButton = screen.getByText('Next') as HTMLElement;
    const devValidRedirectUris = document.getElementById('root_devValidRedirectUris_0') as HTMLElement;
    const testValidRedirectUris = document.getElementById('root_testValidRedirectUris_0') as HTMLElement;
    const prodValidRedirectUris = document.getElementById('root_prodValidRedirectUris_0') as HTMLElement;
    fireEvent.change(devValidRedirectUris, { target: { value: 'http://localhost' } });
    fireEvent.change(testValidRedirectUris, { target: { value: 'http://localhost' } });
    fireEvent.change(prodValidRedirectUris, { target: { value: 'http://localhost' } });
    fireEvent.click(nextButton);
    expect(updateRequest).toHaveBeenCalled();
    // Expect next page to load
    await waitFor(() => screen.getByText("We're a Community"));
  });

  it('Redirects to my-requests on cancel', () => {
    const cancelButton = screen.getByText('Cancel') as HTMLElement;
    fireEvent.click(cancelButton);
    expect(sandbox.push).toHaveBeenCalledWith('/my-requests');
  });

  it('Shows failed state in navigation after submission, and clears failed state on page change only if form data is correct', () => {
    // Submit empty form
    const { firstStageBox, secondStageBox, thirdStageBox, fourthStageBox } = sandbox;
    fireEvent.click(fourthStageBox);
    fireEvent.click(document.querySelector("button[type='submit']") as HTMLElement);
    expect(within(firstStageBox).getByTitle('error'));
    expect(within(secondStageBox).getByTitle('error'));
    expect(within(thirdStageBox).getByTitle('error'));
    expect(within(fourthStageBox).queryByTitle('error')).toBeNull();

    // Navigate to and from third page without fixing errors
    fireEvent.click(thirdStageBox);
    fireEvent.click(fourthStageBox);
    expect(within(thirdStageBox).getByTitle('error'));

    // Navigate to and from third stage with fixing errors
    fireEvent.click(thirdStageBox);
    fireEvent.click(document.querySelector('#root_agreeWithTerms') as HTMLElement);
    fireEvent.click(fourthStageBox);
    expect(within(thirdStageBox).queryByTitle('error')).toBeNull();
  });
});

describe('Form Template Loading Data', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Pre-loads data if a request exists', () => {
    setUpRouter('/', sandbox);
    setUpRender(sampleRequest);
    const { firstStageBox, thirdStageBox } = sandbox;

    // Second page data
    expect(
      screen.getByDisplayValue((sampleRequest.devValidRedirectUris && sampleRequest.devValidRedirectUris[0]) || ''),
    );
    expect(
      screen.getByDisplayValue((sampleRequest.devValidRedirectUris && sampleRequest.devValidRedirectUris[1]) || ''),
    );
    expect(
      screen.getByDisplayValue((sampleRequest.testValidRedirectUris && sampleRequest.testValidRedirectUris[0]) || ''),
    );
    expect(
      screen.getByDisplayValue((sampleRequest.prodValidRedirectUris && sampleRequest.prodValidRedirectUris[0]) || ''),
    );

    // First Page Data
    fireEvent.click(firstStageBox);
    expect(document.querySelector('#root_projectLead input[value="true"]')).toHaveAttribute('checked', '');
    expect(document.querySelector('#root_newToSso input[value="true"]')).toHaveAttribute('checked', '');
    expect(document.querySelector('#root_publicAccess input[value="true"]')).toHaveAttribute('checked', '');
    expect(screen.getByDisplayValue(sampleRequest.projectName || ''));
    expect(screen.getByDisplayValue(sampleRequest.preferredEmail || ''));

    // Third Page Data
    fireEvent.click(thirdStageBox);
    expect(document.querySelector('#root_agreeWithTerms')).toHaveAttribute('checked', '');
  });
});
