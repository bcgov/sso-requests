import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FormTemplate from 'form-components/FormTemplate';
import { updateRequest } from 'services/request';
import { Request } from 'interfaces/Request';
import { setUpRouter } from './utils/setup';
import { errorMessages } from '../utils/constants';

const formButtonText = ['Next', 'Save and Close'];

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('services/request', () => {
  return {
    createRequest: jest.fn(),
    updateRequest: jest.fn(() => Promise.resolve([{}, null])),
    getRequest: jest.fn(),
  };
});

const STEPPER_ERROR = 'Some additional fields require your attention.';

// Container to expose variables from beforeeach to test functions
let sandbox: any = {};

const setUpRender = (request: Request | object | null, currentUser = {}) => {
  const { debug } = render(<FormTemplate currentUser={currentUser} request={request} />);
  sandbox.firstStageBox = screen.queryByText('Requester Info')?.closest('div') as HTMLElement;
  sandbox.secondStageBox = screen.queryByText('Providers and URIs')?.closest('div') as HTMLElement;
  sandbox.thirdStageBox = screen.queryByText('Terms and conditions')?.closest('div') as HTMLElement;
  sandbox.fourthStageBox = screen.queryByText('Review & Submit')?.closest('div') as HTMLElement;
  sandbox.adminReview = screen.queryByText('Comment & Submit')?.closest('div') as HTMLElement;
  return debug;
};

export const sampleRequest: Request = {
  devValidRedirectUris: ['http://dev1.com', 'http://dev2.com'],
  testValidRedirectUris: ['http://test.com'],
  prodValidRedirectUris: ['http://prod.com'],
  publicAccess: true,
  realm: 'onestopauth',
  projectName: 'test project',
  preferredEmail: 'test@email.com',
  projectLead: true,
  agreeWithTerms: true,
  environments: ['dev', 'test', 'prod'],
  archived: false,
  additionalEmails: [],
};

const samplePage3Request = {
  devValidRedirectUris: ['http://dev1.com', 'http://dev2.com'],
  testValidRedirectUris: ['http://test.com'],
  prodValidRedirectUris: ['http://prod.com'],
  realm: 'onestopauth',
};

describe('Form Template Saving and Navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    setUpRouter('/', sandbox);
    setUpRender({});
  });

  it('Should save data and triggers spinner on blur events', async () => {
    const uriInput = document.querySelector('#root_devValidRedirectUris_0') as HTMLElement;
    fireEvent.blur(uriInput);
    expect(updateRequest).toHaveBeenCalled();
    const savingLoader = document.querySelector("svg[aria-label='request-saving']");
    expect(savingLoader).not.toBeNull();
    // wait for spinner to change to checkmark
    await waitFor(() => screen.getByTitle('request-saved'));
  });

  it('Should advance the form when clicking next', async () => {
    setUpRouter('/', sandbox);
    const nextButton = screen.getByText('Next') as HTMLElement;
    fireEvent.click(nextButton);
    await waitFor(() => screen.getByText("We're a Community"));
  });

  it('Should redirect to my-requests on cancel', () => {
    const cancelButton = within(document.querySelector('form.rjsf .form-btns') as HTMLElement).getByText(
      'Save and Close',
    );
    fireEvent.click(cancelButton);
    expect(sandbox.push).toHaveBeenCalledWith({ pathname: '/my-requests' });
  });

  it('Should show failed state in stepper after submission and clear only after filling correct data', () => {
    // Submit empty form
    const { firstStageBox, secondStageBox, thirdStageBox, fourthStageBox } = sandbox;
    fireEvent.click(fourthStageBox);
    fireEvent.click(document.querySelector("button[type='button']") as HTMLElement);
    expect(within(firstStageBox).getByTitle(STEPPER_ERROR));
    expect(within(secondStageBox).getByTitle(STEPPER_ERROR));
    expect(within(thirdStageBox).getByTitle(STEPPER_ERROR));
    expect(within(fourthStageBox).queryByTitle(STEPPER_ERROR)).toBeNull();

    // Navigate to and from third page without fixing errors
    fireEvent.click(thirdStageBox);
    fireEvent.click(fourthStageBox);
    expect(within(thirdStageBox).getByTitle(STEPPER_ERROR));

    // Navigate to and from third stage with fixing errors
    fireEvent.click(thirdStageBox);
    fireEvent.click(document.querySelector('#root_agreeWithTerms') as HTMLElement);
    fireEvent.click(fourthStageBox);
    expect(within(thirdStageBox).queryByTitle(STEPPER_ERROR)).toBeNull();
  });
});

describe('Form Template Loading Data', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should pre-load data if a request exists', () => {
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
    expect(document.querySelector('#root_publicAccess input[value="Public"]')).toHaveAttribute('checked', '');

    // First Page Data
    fireEvent.click(firstStageBox);
    expect(document.querySelector('#root_projectLead input[value="Public"]')).toHaveAttribute('checked', '');
    expect(screen.getByDisplayValue(sampleRequest.projectName || ''));
    expect(screen.getByDisplayValue(sampleRequest.preferredEmail || ''));

    // Third Page Data
    fireEvent.click(thirdStageBox);
    expect(document.querySelector('#root_agreeWithTerms')).toHaveAttribute('checked', '');
  });
});

describe('Error messages', () => {
  it('Should display the expected error messages on page 1 when navigating away and back', () => {
    setUpRouter('/', sandbox);
    setUpRender(null);

    // Set project lead to display form
    const projectLead = document.getElementById('root_projectLead') as HTMLElement;
    const isProjectLeadInput = within(projectLead).getByLabelText('Yes');
    fireEvent.click(isProjectLeadInput);

    // Navigate away and back again
    const nextButton = screen.getByText('Next') as HTMLElement;
    fireEvent.click(nextButton);
    fireEvent.click(sandbox.firstStageBox);

    screen.getByText(errorMessages.preferredEmail);
    screen.getByText(errorMessages.projectName);
  });

  it('Should display the expected page 2 errors', () => {
    setUpRouter('/', sandbox);
    setUpRender({});

    // Navigate away and back to page
    fireEvent.click(sandbox.thirdStageBox);
    fireEvent.click(sandbox.secondStageBox);

    screen.getAllByText(errorMessages.redirectUris);
  });

  it('Should display the expected page 3 errors after navigating away from the page', async () => {
    setUpRouter('/', sandbox);
    setUpRender(samplePage3Request);

    // Navigate away and back to page
    fireEvent.click(sandbox.thirdStageBox);
    fireEvent.click(sandbox.fourthStageBox);
    fireEvent.click(sandbox.thirdStageBox);

    screen.getByText(errorMessages.agreeWithTerms);
  });
});

describe('Admins', () => {
  it('should not show buttons for admins', () => {
    setUpRender(null, { client_roles: ['sso-admin'] });
    formButtonText.forEach((title) => {
      expect(screen.queryByText(title)).toBeNull();
    });
  });
});

describe('Redirect URIs', () => {
  it('Should show the appropriate URIS depending on selected environments', () => {
    setUpRouter('/', sandbox);
    setUpRender(sampleRequest);
    const devCheckbox = screen.getByLabelText('Development') as HTMLInputElement;
    const testCheckbox = screen.getByLabelText('Test') as HTMLInputElement;
    const prodCheckbox = screen.getByLabelText('Production') as HTMLInputElement;

    // Dev checked by default
    expect(devCheckbox.checked).toEqual(true);
    expect(testCheckbox.checked).toEqual(false);
    expect(prodCheckbox.checked).toEqual(false);

    const devValidRedirectUris = document.querySelector('#root_devValidRedirectUris_0');
    let testValidRedirectUris = document.querySelector('#root_testValidRedirectUris_0');
    let prodValidRedirectUris = document.querySelector('#root_prodValidRedirectUris_0');

    // Only displays dev
    expect(devValidRedirectUris).not.toBe(null);
    expect(testValidRedirectUris).toBe(null);
    expect(prodValidRedirectUris).toBe(null);

    // Select test and prod and expect new URI fields
    fireEvent.click(testCheckbox);
    fireEvent.click(prodCheckbox);

    expect(testCheckbox.checked).toEqual(true);
    expect(prodCheckbox.checked).toEqual(true);

    testValidRedirectUris = document.querySelector('#root_testValidRedirectUris_0');
    prodValidRedirectUris = document.querySelector('#root_prodValidRedirectUris_0');

    expect(testValidRedirectUris).not.toBe(null);
    expect(prodValidRedirectUris).not.toBe(null);
  });
});
