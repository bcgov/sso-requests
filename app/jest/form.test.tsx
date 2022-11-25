import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FormTemplate from 'form-components/FormTemplate';
import { updateRequest } from 'services/request';
import { Integration } from 'interfaces/Request';
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

const setUpRender = (request: Integration | object | null, currentUser = {}) => {
  const result = render(<FormTemplate currentUser={currentUser} request={request} />);
  sandbox.firstStageBox = screen.queryByTestId(`stage-1`)?.closest('div') as HTMLElement;
  sandbox.secondStageBox = screen.queryByTestId(`stage-2`)?.closest('div') as HTMLElement;
  sandbox.thirdStageBox = screen.queryByTestId(`stage-3`)?.closest('div') as HTMLElement;
  sandbox.fourthStageBox = screen.queryByTestId(`stage-4`)?.closest('div') as HTMLElement;
  sandbox.fifthStageBox = screen.queryByTestId(`stage-5`)?.closest('div') as HTMLElement;
  sandbox.adminReview = screen.queryByText('Review & Submit')?.closest('div') as HTMLElement;
  return result;
};

export const sampleRequest: Integration = {
  id: 0,
  devValidRedirectUris: ['http://dev1.com', 'http://dev2.com'],
  testValidRedirectUris: ['http://test.com'],
  prodValidRedirectUris: ['http://prod.com'],
  publicAccess: true,
  authType: 'browser-login',
  projectName: 'test project',
  projectLead: true,
  agreeWithTerms: true,
  environments: ['dev'],
  archived: false,
  usesTeam: false,
  serviceType: 'gold',
};

const samplePage3Request = {
  id: 0,
  devValidRedirectUris: ['http://dev1.com', 'http://dev2.com'],
  testValidRedirectUris: ['http://test.com'],
  prodValidRedirectUris: ['http://prod.com'],
  serviceType: 'gold',
};

describe('Form Template Saving and Navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    setUpRouter('/', sandbox);
    setUpRender({ id: 0 });
  });

  it('Should save data and triggers spinner on blur events', async () => {
    fireEvent.click(sandbox.secondStageBox);
    const publicRadio = document.querySelector('#root_publicAccess-Public') as HTMLElement;
    fireEvent.change(publicRadio, { target: { checked: true } });
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => document.querySelector("svg[testid='rotating-lines-svg']"));
    // wait for spinner to change to checkmark
    await waitFor(() => document.querySelector("svg[icon='check']"));
  });

  it('Should advance the form when clicking next', async () => {
    setUpRouter('/', sandbox);
    fireEvent.click(sandbox.secondStageBox);
    const nextButton = screen.getByText('Next') as HTMLElement;
    fireEvent.click(nextButton);
    await waitFor(() => screen.getByText("We're a Community"));
  });

  it('Should redirect to my-dashboard on cancel', () => {
    fireEvent.click(sandbox.secondStageBox);
    const cancelButton = within(
      document.querySelector("form.rjsf [data-test-id='form-btns']") as HTMLElement,
    ).getByText('Save and Close');
    fireEvent.click(cancelButton);
    expect(sandbox.push).toHaveBeenCalledWith({ pathname: '/my-dashboard' });
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

  it('Should pre-load data if a request exists', async () => {
    setUpRouter('/', sandbox);
    setUpRender(sampleRequest);
    const { firstStageBox, secondStageBox, thirdStageBox, fourthStageBox } = sandbox;

    fireEvent.click(firstStageBox);
    const firstStageElementSelector = '#root_projectLead input[value="true"';
    await waitFor(() => document.querySelector(firstStageElementSelector));
    expect(document.querySelector(firstStageElementSelector)).toHaveAttribute('checked', '');
    expect(screen.getByDisplayValue(sampleRequest.projectName || ''));

    fireEvent.click(secondStageBox);

    const secondStageElementSelector = '#root_protocol input[type="radio"][value="oidc"]';
    await waitFor(() => document.querySelector(secondStageElementSelector));

    fireEvent.click(thirdStageBox);
    expect(
      screen.getByDisplayValue((sampleRequest.devValidRedirectUris && sampleRequest.devValidRedirectUris[0]) || ''),
    );
    expect(
      screen.getByDisplayValue((sampleRequest.devValidRedirectUris && sampleRequest.devValidRedirectUris[1]) || ''),
    );

    fireEvent.click(fourthStageBox);
    const fourthStageElementSelector = '#root_agreeWithTerms';
    expect(document.querySelector(fourthStageElementSelector)).toHaveAttribute('checked', '');
  });
});

describe('Error messages', () => {
  it('Should display the expected error messages on page 1 when navigating away and back', () => {
    setUpRouter('/', sandbox);
    setUpRender(null);

    // Set project lead and team to display form
    const usesTeam = document.getElementById('root_usesTeam') as HTMLElement;
    const usesTeamInput = within(usesTeam).getByLabelText('No');
    fireEvent.click(usesTeamInput);

    const projectLead = document.getElementById('root_projectLead') as HTMLElement;
    const isProjectLeadInput = within(projectLead).getByLabelText('Yes');
    fireEvent.click(isProjectLeadInput);

    // Navigate away and back again
    const nextButton = screen.getByText('Next') as HTMLElement;
    fireEvent.click(nextButton);
    fireEvent.click(sandbox.firstStageBox);

    screen.getByText(errorMessages.projectName);
  });

  it('Should display the expected page 2 errors', async () => {
    setUpRouter('/', sandbox);
    setUpRender({ id: 0, environments: ['dev'], devValidRedirectUris: [''], serviceType: 'gold' });

    // Navigate away and back to page
    fireEvent.click(sandbox.thirdStageBox);

    const devValidRedirectUrisSelector = '#root_devValidRedirectUris_0';
    await waitFor(() => document.querySelector(devValidRedirectUrisSelector));
    const uriInput = document.querySelector(devValidRedirectUrisSelector) as HTMLElement;
    fireEvent.change(uriInput, { target: { value: 'invalid-url' } });

    fireEvent.click(sandbox.secondStageBox);
    fireEvent.click(sandbox.thirdStageBox);

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

describe('Basic Info - Identity Providers', () => {
  it('should be able to change BCeID type in draft', async () => {
    setUpRouter('/', sandbox);
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bceidbasic'],
      status: 'draft',
      environments: ['dev', 'test', 'prod'],
      bceidApproved: false,
    });

    fireEvent.click(sandbox.secondStageBox);

    const idpTitles = ['Basic BCeID', 'Business BCeID', 'Basic or Business BCeID'];

    const idpCheckboxMap: { [key: string]: HTMLInputElement } = {};

    for (let x = 0; x < idpTitles.length; x++) {
      const elem = getByText(idpTitles[x])?.parentElement?.querySelector("input[type='checkbox']");
      if (elem) idpCheckboxMap[idpTitles[x]] = elem as HTMLInputElement;
    }

    expect(idpCheckboxMap['Basic BCeID']).not.toBeDisabled();
    expect(idpCheckboxMap['Business BCeID']).not.toBeDisabled();
    expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeDisabled();

    expect(idpCheckboxMap['Basic BCeID']).toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeChecked();

    // should select another BCeID type
    fireEvent.click(idpCheckboxMap['Basic or Business BCeID']);
    expect(idpCheckboxMap['Basic BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).toBeChecked();

    // should not unselect all BCeID types
    fireEvent.click(idpCheckboxMap['Basic or Business BCeID']);
    expect(idpCheckboxMap['Basic BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeChecked();
  });

  it('should be able to change BCeID type until approved', async () => {
    setUpRouter('/', sandbox);
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bceidbasic'],
      status: 'applied',
      environments: ['dev', 'test', 'prod'],
      bceidApproved: false,
    });

    fireEvent.click(sandbox.secondStageBox);

    const idpTitles = ['Basic BCeID', 'Business BCeID', 'Basic or Business BCeID'];

    const idpCheckboxMap: { [key: string]: HTMLInputElement } = {};

    for (let x = 0; x < idpTitles.length; x++) {
      const elem = getByText(idpTitles[x])?.parentElement?.querySelector("input[type='checkbox']");
      if (elem) idpCheckboxMap[idpTitles[x]] = elem as HTMLInputElement;
    }

    expect(idpCheckboxMap['Basic BCeID']).not.toBeDisabled();
    expect(idpCheckboxMap['Business BCeID']).not.toBeDisabled();
    expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeDisabled();

    expect(idpCheckboxMap['Basic BCeID']).toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeChecked();

    // should select another BCeID type
    fireEvent.click(idpCheckboxMap['Basic or Business BCeID']);
    expect(idpCheckboxMap['Basic BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).toBeChecked();

    // should not unselect all BCeID types
    fireEvent.click(idpCheckboxMap['Basic or Business BCeID']);
    expect(idpCheckboxMap['Basic BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).toBeChecked();
  });

  it('should be able freezed after BCeID approved', async () => {
    setUpRouter('/', sandbox);
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bceidbasic'],
      status: 'applied',
      environments: ['dev', 'test', 'prod'],
      bceidApproved: true,
    });

    fireEvent.click(sandbox.secondStageBox);

    const idpTitles = ['Basic BCeID', 'Business BCeID', 'Basic or Business BCeID'];

    const idpCheckboxMap: { [key: string]: HTMLInputElement } = {};

    for (let x = 0; x < idpTitles.length; x++) {
      const elem = getByText(idpTitles[x])?.parentElement?.querySelector("input[type='checkbox']");
      if (elem) idpCheckboxMap[idpTitles[x]] = elem as HTMLInputElement;
    }

    expect(idpCheckboxMap['Basic BCeID']).toBeDisabled();
    expect(idpCheckboxMap['Business BCeID']).toBeDisabled();
    expect(idpCheckboxMap['Basic or Business BCeID']).toBeDisabled();

    expect(idpCheckboxMap['Basic BCeID']).toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeChecked();

    // should select another BCeID type
    fireEvent.click(idpCheckboxMap['Basic or Business BCeID']);
    expect(idpCheckboxMap['Basic BCeID']).toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeChecked();
  });
});
