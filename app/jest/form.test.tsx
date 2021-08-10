import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FormTemplate from 'form-components/FormTemplate';
import { createRequest, updateRequest, getRequest } from 'services/request';
import { Request } from 'interfaces/Request';
import { setUpRouter } from './utils/setup';
import { errorMessages } from '../utils/constants';

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

const STEPPER_ERROR = 'Some additional fields require your attention.';

// Container to expose variables from beforeeach to test functions
let sandbox: any = {};

const setUpRender = (request: Request | object | null) => {
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
  environments: ['dev', 'test', 'prod'],
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

  it('Saves data and triggers spinner on blur events', async () => {
    const uriInput = document.querySelector('#root_devValidRedirectUris_0') as HTMLElement;
    fireEvent.blur(uriInput);
    expect(updateRequest).toHaveBeenCalled();
    const savingLoader = document.querySelector("svg[aria-label='request-saving']");
    expect(savingLoader).not.toBeNull();
    // wait for spinner to change to checkmark
    await waitFor(() => screen.getByTitle('request-saved'));
  });

  // it('Saves and advances the form when clicking next', async () => {
  //   const nextButton = screen.getByText('Next') as HTMLElement;
  //   const idirRealm = document.querySelector("input[value='onestopauth']") as HTMLElement;
  //   const devValidRedirectUris = document.getElementById('root_devValidRedirectUris_0') as HTMLElement;
  //   const testValidRedirectUris = document.getElementById('root_testValidRedirectUris_0') as HTMLElement;
  //   const prodValidRedirectUris = document.getElementById('root_prodValidRedirectUris_0') as HTMLElement;
  //   fireEvent.change(devValidRedirectUris, { target: { value: 'http://localhost' } });
  //   fireEvent.change(testValidRedirectUris, { target: { value: 'http://localhost' } });
  //   fireEvent.change(prodValidRedirectUris, { target: { value: 'http://localhost' } });
  //   fireEvent.click(idirRealm);
  //   fireEvent.click(nextButton);
  //   expect(updateRequest).toHaveBeenCalled();
  //   // Expect next page to load
  //   await waitFor(() => screen.getByText("We're a Community"));
  // });

  it('Redirects to my-requests on cancel', () => {
    const cancelButton = screen.getByText('Cancel') as HTMLElement;
    fireEvent.click(cancelButton);
    expect(sandbox.push).toHaveBeenCalledWith('/my-requests');
  });

  // it('Shows failed state in navigation after submission, and clears failed state on page change only if form data is correct', () => {
  //   // Submit empty form
  //   const { firstStageBox, secondStageBox, thirdStageBox, fourthStageBox } = sandbox;
  //   fireEvent.click(fourthStageBox);
  //   fireEvent.click(document.querySelector("button[type='button']") as HTMLElement);
  //   expect(within(firstStageBox).getByTitle(STEPPER_ERROR));
  //   expect(within(secondStageBox).getByTitle(STEPPER_ERROR));
  //   expect(within(thirdStageBox).getByTitle(STEPPER_ERROR));
  //   expect(within(fourthStageBox).queryByTitle(STEPPER_ERROR)).toBeNull();

  //   // Navigate to and from third page without fixing errors
  //   fireEvent.click(thirdStageBox);
  //   fireEvent.click(fourthStageBox);
  //   expect(within(thirdStageBox).getByTitle(STEPPER_ERROR));

  //   // Navigate to and from third stage with fixing errors
  //   fireEvent.click(thirdStageBox);
  //   fireEvent.click(document.querySelector('#root_agreeWithTerms') as HTMLElement);
  //   fireEvent.click(fourthStageBox);
  //   expect(within(thirdStageBox).queryByTitle(STEPPER_ERROR)).toBeNull();
  // });
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

// describe('Error messages', () => {
//   it('Displays the expected error messages on page 1', () => {
//     setUpRouter('/', sandbox);
//     setUpRender(null);
//     const projectLead = document.getElementById('root_projectLead') as HTMLElement;
//     const isProjectLeadInput = within(projectLead).getByLabelText('Yes');
//     fireEvent.click(isProjectLeadInput);
//     const nextButton = screen.getByText('Next') as HTMLElement;
//     fireEvent.click(nextButton);

//     screen.getAllByText(errorMessages.newToSso);
//     screen.getAllByText(errorMessages.publicAccess);
//     screen.getByText(errorMessages.preferredEmail);
//     screen.getByText(errorMessages.projectName);
//   });
//   it('Displays the expected page 2 errors', () => {
//     setUpRouter('/', sandbox);
//     setUpRender({});
//     const nextButton = screen.getByText('Next') as HTMLElement;
//     fireEvent.click(nextButton);

//     screen.getAllByText(errorMessages.redirectUris);
//     screen.getByText(errorMessages.realm);
//   });
//   it('Displays the expected page 3 errors', async () => {
//     setUpRouter('/', sandbox);
//     const debug = setUpRender(samplePage3Request);
//     const nextButton = screen.getByText('Next') as HTMLElement;
//     fireEvent.click(nextButton);
//     await waitFor(() => screen.getByText("We're a Community"));
//     fireEvent.click(nextButton);

//     screen.getByText(errorMessages.agreeWithTerms);
//   });
// });
