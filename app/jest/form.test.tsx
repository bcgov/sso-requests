import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FormTemplate from 'form-components/FormTemplate';
import { updateRequest } from 'services/request';
import { Integration } from 'interfaces/Request';
import { setUpRouter } from './utils/setup';
import { errorMessages } from '../utils/constants';
import { sampleRequest } from './samples/integrations';
import { MAX_IDLE_SECONDS, MAX_LIFETIME_SECONDS } from '@app/utils/validate';
import { debug } from 'jest-preview';

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

jest.mock('services/team', () => {
  return {
    getMyTeams: jest.fn(() => Promise.resolve([[], null])),
    getAllowedTeams: jest.fn(() => Promise.resolve([[], null])),
  };
});

const samplePrivacyZones = [
  {
    privacy_zone_uri: 'urn:ca:bc:gov:health:mocksit',
    privacy_zone_name: 'Health (Citizen)',
  },
  {
    privacy_zone_uri: 'urn:ca:bc:gov:fin:ctz:pz:sit',
    privacy_zone_name: 'Finance (Citizen)',
  },
  {
    privacy_zone_uri: 'urn:ca:bc:gov:educ:sit',
    privacy_zone_name: 'Education (Citizen)',
  },
];

const sampleAttributes = [
  {
    name: 'postal_code',
  },
  {
    name: 'user_type',
  },
  {
    name: 'birthdate',
  },
];

jest.mock('services/bc-services-card', () => {
  return {
    fetchPrivacyZones: jest.fn(() => {
      return Promise.resolve([samplePrivacyZones, null]);
    }),
    fetchAttributes: jest.fn(() => {
      return Promise.resolve([sampleAttributes, null]);
    }),
  };
});

const STEPPER_ERROR = 'Some additional fields require your attention.';

// Container to expose variables from beforeeach to test functions
let sandbox: any = {};

const setUpRender = (request: Integration | object | null, currentUser = {}) => {
  const result = render(<FormTemplate currentUser={currentUser} request={request} />);
  sandbox.requesterInfoBox = screen.queryByTestId(`stage-requester-info`)?.closest('div') as HTMLElement;
  sandbox.basicInfoBox = screen.queryByTestId(`stage-basic-info`)?.closest('div') as HTMLElement;
  sandbox.developmentBox = screen.queryByTestId(`stage-development`)?.closest('div') as HTMLElement;
  sandbox.testBox = screen.queryByTestId(`stage-test`)?.closest('div') as HTMLElement;
  sandbox.productionBox = screen.queryByTestId(`stage-production`)?.closest('div') as HTMLElement;
  sandbox.termsAndConditionsBox = screen.queryByTestId(`stage-terms-and-conditions`)?.closest('div') as HTMLElement;
  sandbox.adminReview = screen.queryByTestId(`stage-review-submit`)?.closest('div') as HTMLElement;
  return result;
};

const samplePage3Request = {
  id: 0,
  devValidRedirectUris: ['https://dev1.com', 'https://dev2.com'],
  testValidRedirectUris: ['https://test.com'],
  prodValidRedirectUris: ['https://prod.com'],
  serviceType: 'gold',
};

beforeEach(() => {
  setUpRouter('/', sandbox);
});

describe('Form Template Saving and Navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should save data and triggers spinner on blur events', async () => {
    setUpRender({
      id: 0,
      projectName: 'test project1',
      projectLead: true,
      usesTeam: false,
      teamId: undefined,
      serviceType: 'gold',
      protocol: 'oidc',
      authType: 'browser-login',
    });

    // Navigate away and back again
    const nextButton = screen.getByText('Next') as HTMLElement;
    fireEvent.click(nextButton);

    const publicRadio = document.querySelector('#root_publicAccess-Public') as HTMLElement;
    fireEvent.change(publicRadio, { target: { checked: true } });
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => document.querySelector("svg[testid='rotating-lines-svg']"));
    // wait for spinner to change to checkmark
    await waitFor(() => document.querySelector("svg[icon='check']"));
  });

  it('Should call the update function with the most recent data', async () => {
    setUpRender({
      id: 1,
      projectName: 'test project2',
      status: 'draft',
      protocol: 'oidc',
      authType: 'browser-login',
      projectLead: true,
      usesTeam: false,
      teamId: undefined,
      environments: ['dev', 'test', 'prod'],
    });

    fireEvent.click(sandbox.basicInfoBox);

    jest.clearAllMocks();

    const THROTTLE_TIMEOUT = 2000;

    const publicAccessRadioButton = document.querySelector('input[name="root_publicAccess"]') as HTMLElement;
    const serviceAccountRadioButton = document.querySelector('input[value="service-account"]') as HTMLElement;

    // Set access public, then switch to service account. API request should have the updated value as confidential.
    fireEvent.click(publicAccessRadioButton);
    fireEvent.click(serviceAccountRadioButton);

    // Wait for the throttle to catch all api calls
    await new Promise((res, rej) => {
      setTimeout(() => {
        res(true);
      }, THROTTLE_TIMEOUT);
    });

    expect((updateRequest as jest.Mock).mock.calls[1].length).toBe(1);
    expect((updateRequest as jest.Mock).mock.calls[1][0].publicAccess).toBe(false);
  });

  it('Should advance the form when clicking next', async () => {
    setUpRender({
      id: 0,
    });
    fireEvent.click(sandbox.basicInfoBox);
    const nextButton = screen.getByText('Next') as HTMLElement;
    fireEvent.click(nextButton);
    await waitFor(() => screen.getByText("We're a Community"));
  });

  it('Should redirect to my-dashboard on cancel', async () => {
    setUpRender({
      id: 0,
    });
    fireEvent.click(sandbox.basicInfoBox);
    const cancelButton = within(document.querySelector("form.rjsf [data-testid='form-btns']") as HTMLElement).getByText(
      'Save and Close',
    );
    fireEvent.click(cancelButton);
    await waitFor(() => expect(sandbox.push).toHaveBeenCalledWith({ pathname: '/my-dashboard' }));
  });

  it('Should show failed state in stepper after submission and clear only after filling correct data', async () => {
    const component = setUpRender({
      id: 0,
    });
    // Submit empty form
    const { requesterInfoBox, basicInfoBox, termsAndConditionsBox, adminReview } = sandbox;
    fireEvent.click(adminReview);
    const submitButton = await component.findByText('Submit', { selector: 'button' });
    fireEvent.click(submitButton as HTMLElement);

    expect(within(requesterInfoBox).getByTitle(STEPPER_ERROR));
    expect(within(basicInfoBox).getByTitle(STEPPER_ERROR));
    expect(within(termsAndConditionsBox).getByTitle(STEPPER_ERROR));
    expect(within(adminReview).queryByTitle(STEPPER_ERROR)).toBeNull();

    // Navigate to and from third page without fixing errors
    fireEvent.click(termsAndConditionsBox);
    fireEvent.click(adminReview);

    expect(within(termsAndConditionsBox).getByTitle(STEPPER_ERROR));

    // Navigate to and from third stage with fixing errors
    fireEvent.click(termsAndConditionsBox);
    fireEvent.click(document.querySelector('#root_agreeWithTerms') as HTMLElement);
    fireEvent.click(adminReview);
    await waitFor(() => expect(within(termsAndConditionsBox).queryByTitle(STEPPER_ERROR)).toBeNull());
  });

  it('Loads correct usesTeam state', async () => {
    const withTeamComponent = await setUpRender({
      id: 0,
      status: 'draft',
      usesTeam: true,
      teamId: null,
    });
    let usesTeamCheckbox = withTeamComponent.getByLabelText('Project Team') as HTMLInputElement;
    expect(usesTeamCheckbox.checked).toBe(true);
    withTeamComponent.unmount();

    const withoutTeamComponent = await setUpRender({
      id: 0,
      status: 'draft',
      usesTeam: false,
      teamId: null,
    });
    usesTeamCheckbox = withoutTeamComponent.getByLabelText('Project Team') as HTMLInputElement;
    expect(usesTeamCheckbox.checked).toBe(false);
  });
});

describe('Form Template Loading Data', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should pre-load data if a request exists', async () => {
    setUpRender({ ...sampleRequest, projectName: 'testProject' });
    const { requesterInfoBox, basicInfoBox, developmentBox, termsAndConditionsBox } = sandbox;

    fireEvent.click(requesterInfoBox);
    expect(screen.getByDisplayValue('testProject'));

    fireEvent.click(basicInfoBox);

    const secondStageElementSelector = '#root_protocol input[type="radio"][value="oidc"]';
    await waitFor(() => document.querySelector(secondStageElementSelector));

    fireEvent.click(developmentBox);
    expect(
      screen.getByDisplayValue((sampleRequest.devValidRedirectUris && sampleRequest.devValidRedirectUris[0]) || ''),
    );
    expect(
      screen.getByDisplayValue((sampleRequest.devValidRedirectUris && sampleRequest.devValidRedirectUris[1]) || ''),
    );
    // Pre-load should convert from seconds to minutes
    screen.getByDisplayValue(String((sampleRequest.devSessionIdleTimeout as number) / 60));
    screen.getByDisplayValue(String((sampleRequest.devSessionMaxLifespan as number) / 60));

    fireEvent.click(termsAndConditionsBox);
    const fourthStageElementSelector = '#root_agreeWithTerms';
    expect(document.querySelector(fourthStageElementSelector)).toHaveAttribute('checked', '');
  });
});

describe('Error messages', () => {
  it('Should display the expected error messages on page 1 when navigating away and back', async () => {
    setUpRender(null);
    // Navigate away and back again
    const nextButton = screen.getByText('Next') as HTMLElement;
    fireEvent.click(nextButton);
    fireEvent.click(sandbox.requesterInfoBox);

    await waitFor(() => screen.getByText(errorMessages.projectName));
  });

  it('Should display the expected page 2 errors', async () => {
    setUpRender(
      { id: 0, environments: ['dev'], devValidRedirectUris: [''], serviceType: 'gold' },
      { client_roles: ['sso-admin'], isAdmin: true },
    );

    // Navigate away and back to page
    fireEvent.click(sandbox.developmentBox);

    const devValidRedirectUrisSelector = '#root_devValidRedirectUris_0';
    await waitFor(() => document.querySelector(devValidRedirectUrisSelector));
    const uriInput = document.querySelector(devValidRedirectUrisSelector) as HTMLElement;
    const clientIdleInput = document.querySelector('#root_devSessionIdleTimeout') as HTMLElement;
    const clientMaxInput = document.querySelector('#root_devSessionMaxLifespan') as HTMLElement;
    fireEvent.change(uriInput, { target: { value: 'invalid-url' } });

    // Set each input over the limit
    fireEvent.change(clientIdleInput, { target: { value: MAX_IDLE_SECONDS / 60 + 1 } });
    fireEvent.change(clientMaxInput, { target: { value: MAX_LIFETIME_SECONDS / 60 + 1 } });

    fireEvent.click(sandbox.basicInfoBox);
    fireEvent.click(sandbox.developmentBox);

    screen.getAllByText(errorMessages.redirectUris);
    screen.getByText(errorMessages.clientMaxLifespan);
    screen.getByText(errorMessages.clientIdleTimeout);
  });

  it('Should display the expected page 3 errors after navigating away from the page', async () => {
    setUpRender(samplePage3Request);

    // Navigate away and back to page
    fireEvent.click(sandbox.termsAndConditionsBox);
    fireEvent.click(sandbox.requesterInfoBox);
    fireEvent.click(sandbox.termsAndConditionsBox);

    await waitFor(() => screen.getByText(errorMessages.agreeWithTerms));
  });
});

describe('Client Sessions', () => {
  it('Sends client session idle and max as seconds when making calls to the API', async () => {
    const component = setUpRender(
      { ...sampleRequest, devIdps: ['azureidir'] },
      { client_roles: ['sso-admin'], isAdmin: true },
    );
    const { developmentBox, adminReview } = sandbox;
    fireEvent.click(developmentBox);

    jest.clearAllMocks();

    const clientIdleInput = document.querySelector('#root_devSessionIdleTimeout') as HTMLElement;
    const clientMaxInput = document.querySelector('#root_devSessionMaxLifespan') as HTMLElement;

    const idleTimeout = 10;
    const maxLifespan = 100;
    fireEvent.change(clientIdleInput, { target: { value: String(idleTimeout) } });
    fireEvent.change(clientMaxInput, { target: { value: String(maxLifespan) } });

    fireEvent.click(adminReview);
    screen.getByText('Submit').click();
    const confirmButton = await component.findByText('Confirm', { selector: 'button' });
    fireEvent.click(confirmButton as HTMLElement);

    const updateRequestCalls = (updateRequest as jest.Mock).mock.calls;
    expect(updateRequestCalls.length).toBe(1);
    expect(updateRequestCalls[0][0].devSessionIdleTimeout).toBe(idleTimeout * 60);
    expect(updateRequestCalls[0][0].devSessionMaxLifespan).toBe(maxLifespan * 60);
    expect(updateRequest).toHaveBeenCalled();
  });

  it('Prevents non-admins from updating client session settings', () => {
    setUpRender(sampleRequest, { client_roles: [], isAdmin: false });
    const { developmentBox } = sandbox;
    fireEvent.click(developmentBox);

    const clientIdleInput = document.querySelector('#root_devSessionIdleTimeout') as HTMLElement;
    const clientMaxInput = document.querySelector('#root_devSessionMaxLifespan') as HTMLElement;

    expect(clientIdleInput).toBeDisabled();
    expect(clientMaxInput).toBeDisabled();
  });

  it('Handles non-numeric and negative input appropriately', () => {
    setUpRender(sampleRequest, { client_roles: ['sso-admin'], isAdmin: true });
    const { developmentBox } = sandbox;
    fireEvent.click(developmentBox);

    const clientOfflineIdleInput = document.querySelector('#root_devOfflineSessionIdleTimeout') as HTMLElement;
    const clientOfflineMaxInput = document.querySelector('#root_devOfflineSessionMaxLifespan') as HTMLElement;

    expect(clientOfflineIdleInput).toBeDisabled();
    expect(clientOfflineMaxInput).toBeDisabled();

    const clientIdleInput = document.querySelector('#root_devSessionIdleTimeout') as HTMLInputElement;
    const baseValue = clientIdleInput.value;

    // Text does not change value
    fireEvent.change(clientIdleInput, { target: { value: 'stringnumber' } });
    expect(clientIdleInput.value).toBe(baseValue);

    // Negative numbers not allowed
    fireEvent.change(clientIdleInput, { target: { value: '-10' } });
    expect(clientIdleInput.value).toBe(baseValue);

    // Allows backspace. Being unable to clear the 0 kills me
    fireEvent.change(clientIdleInput, { target: { value: '' } });
    expect(clientIdleInput.value).toBe('');

    // Defaults back to 0 if field left empty
    fireEvent.change(clientIdleInput, { target: { value: '' } });
    fireEvent.blur(clientIdleInput);
    expect(clientIdleInput.value).toBe('0');
  });

  it('Handles offline access switch and dependent fields (offline session idle and max)', () => {
    setUpRender(sampleRequest, { client_roles: ['sso-admin'], isAdmin: true });
    const { developmentBox } = sandbox;
    fireEvent.click(developmentBox);

    let clientOfflineIdleInput = document.querySelector('#root_devOfflineSessionIdleTimeout') as HTMLElement;
    let clientOfflineMaxInput = document.querySelector('#root_devOfflineSessionMaxLifespan') as HTMLElement;

    expect(clientOfflineIdleInput).toBeDisabled();
    expect(clientOfflineMaxInput).toBeDisabled();

    // enable the offline access scope and it enables the offline idle and max fields
    const offlineAccessSwitch = document.querySelector('#root_devOfflineAccessEnabled') as HTMLElement;
    fireEvent.click(offlineAccessSwitch);

    expect(clientOfflineIdleInput).not.toBeDisabled();
    expect(clientOfflineMaxInput).not.toBeDisabled();
  });
});

describe('Basic Info - Identity Providers', () => {
  it('should be able to change/unselect BCeID type in draft', async () => {
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bceidbasic'],
      status: 'draft',
      environments: ['dev', 'test', 'prod'],
      bceidApproved: false,
    });

    fireEvent.click(sandbox.basicInfoBox);

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
    await waitFor(() => expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeChecked());
  });

  it('should be able to change BCeID type until approved', async () => {
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bceidbasic'],
      status: 'applied',
      environments: ['dev', 'test', 'prod'],
      bceidApproved: false,
    });

    fireEvent.click(sandbox.basicInfoBox);

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
  });

  it('Should disable alternative bceid options after approval', async () => {
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bceidbasic'],
      status: 'applied',
      environments: ['dev', 'test', 'prod'],
      bceidApproved: true,
    });

    fireEvent.click(sandbox.basicInfoBox);

    const idpTitles = ['Basic BCeID', 'Business BCeID', 'Basic or Business BCeID'];

    const idpCheckboxMap: { [key: string]: HTMLInputElement } = {};

    for (let x = 0; x < idpTitles.length; x++) {
      const elem = getByText(idpTitles[x])?.parentElement?.querySelector("input[type='checkbox']");
      if (elem) idpCheckboxMap[idpTitles[x]] = elem as HTMLInputElement;
    }

    expect(idpCheckboxMap['Basic BCeID']).not.toBeDisabled();
    expect(idpCheckboxMap['Business BCeID']).toBeDisabled();
    expect(idpCheckboxMap['Basic or Business BCeID']).toBeDisabled();

    expect(idpCheckboxMap['Basic BCeID']).toBeChecked();
    expect(idpCheckboxMap['Business BCeID']).not.toBeChecked();
    expect(idpCheckboxMap['Basic or Business BCeID']).not.toBeChecked();
  });

  it("Should only disable digital credential if it's a SAML integration", async () => {
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      protocol: 'saml',
      devIdps: [],
      status: 'draft',
      environments: ['dev', 'test', 'prod'],
    });

    fireEvent.click(sandbox.basicInfoBox);
    const digitalCredentialCheckbox =
      getByText('Digital Credential')?.parentElement?.querySelector("input[type='checkbox");
    expect(digitalCredentialCheckbox).toBeDisabled();

    // Switch to OIDC and check if it's enabled
    const oidcRadio = screen.getByLabelText('OpenID Connect');
    oidcRadio.click();

    expect(digitalCredentialCheckbox).toBeEnabled();
  });

  it("Removes digital credential from the list of IDPs if it's a SAML integration", async () => {
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      protocol: 'oidc',
      devIdps: ['digitalcredential'],
      status: 'draft',
      environments: ['dev', 'test', 'prod'],
    });

    fireEvent.click(sandbox.basicInfoBox);
    const digitalCredentialCheckbox = getByText('Digital Credential')?.parentElement?.querySelector(
      "input[type='checkbox",
    ) as HTMLInputElement;
    expect(digitalCredentialCheckbox?.checked).toBeTruthy();

    const samlRadio = screen.getByLabelText('SAML');
    samlRadio.click();

    expect(digitalCredentialCheckbox?.checked).toBeFalsy();
  });
});

describe('BC Services Card IDP and dependencies', () => {
  it("Shows BC Services Card IDP from the list of IDPs if it's a SAML integration", async () => {
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      protocol: 'saml',
      devIdps: ['bcservicescard'],
      status: 'draft',
      environments: ['dev', 'test', 'prod'],
    });

    fireEvent.click(sandbox.basicInfoBox);
    const bcscCheckbox = getByText('BC Services Card')?.parentElement?.querySelector(
      "input[type='checkbox",
    ) as HTMLInputElement;
    expect(bcscCheckbox?.checked).toBeTruthy();
  });

  it('should show the BC Services Card IDP but hide privacy zone, attributes, and home page uri if not selected', async () => {
    setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['azureidir', 'bceidbasic'],
      status: 'draft',
      environments: ['dev', 'test', 'prod'],
    });
    fireEvent.click(sandbox.basicInfoBox);
    expect(screen.getByText('BC Services Card')).toBeInTheDocument();
    expect(screen.queryByTestId('root_bcscPrivacyZone_title')).toBeNull();
    expect(screen.queryByTestId('root_bcscAttributes_title')).toBeNull();
    fireEvent.click(sandbox.developmentBox);
    expect(screen.queryByTestId('root_devHomePageUri_title')).toBeNull();
  });

  it('should show the BC Services Card IDP and show error upon leaving dependencies blank', async () => {
    setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bcservicescard'],
      status: 'draft',
      environments: ['dev', 'test', 'prod'],
      devValidRedirectUris: ['https://dev1.com', 'https://dev2.com'],
      testValidRedirectUris: ['https://test1.com', 'https://test2.com'],
      prodValidRedirectUris: ['https://prod1.com', 'https://prod2.com'],
    });
    fireEvent.click(sandbox.basicInfoBox);

    expect(screen.getByText('BC Services Card')).toBeInTheDocument();
    expect(screen.queryByTestId('root_bcscPrivacyZone_title')).not.toBeNull();
    expect(screen.queryByTestId('root_bcscAttributes_title')).not.toBeNull();

    // Navigate away and back again
    const nextButton = screen.getByText('Next') as HTMLElement;
    fireEvent.click(nextButton);
    fireEvent.click(sandbox.basicInfoBox);
    expect(screen.getByText('Privacy zone is required for BC Services Card')).toBeInTheDocument();
    expect(screen.getByText('Please select at least one attribute')).toBeInTheDocument();
    fireEvent.click(sandbox.developmentBox);
    expect(screen.queryByTestId('root_devHomePageUri_title')).not.toBeNull();
    expect(screen.getByText('Please enter a valid URI')).toBeInTheDocument();
  });

  it('should show the BC Services Card IDP and show privacy zone and attributes if selected', async () => {
    setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bcservicescard', 'bceidbasic'],
      status: 'draft',
      environments: ['dev', 'test', 'prod'],
      devValidRedirectUris: ['https://dev1.com', 'https://dev2.com'],
      testValidRedirectUris: ['https://test1.com', 'https://test2.com'],
      prodValidRedirectUris: ['https://prod1.com', 'https://prod2.com'],
    });
    fireEvent.click(sandbox.basicInfoBox);

    expect(screen.getByText('BC Services Card')).toBeInTheDocument();
    expect(screen.queryByTestId('root_bcscPrivacyZone_title')).not.toBeNull();
    expect(screen.queryByTestId('root_bcscAttributes_title')).not.toBeNull();

    const bcscPrivacyZoneDropDown = screen.getByTestId('bcsc-privacy-zone') as HTMLElement;
    const privacyZoneinput = bcscPrivacyZoneDropDown.lastChild;
    fireEvent.keyDown(privacyZoneinput as HTMLElement, { keyCode: 40 });
    const privacyZoneOption = await screen.findByText(samplePrivacyZones[0].privacy_zone_name);
    fireEvent.click(privacyZoneOption);

    const bcscAttributesDropDown = screen.getByTestId('bcsc-attributes') as HTMLElement;
    const attributesInput = bcscAttributesDropDown.lastChild;
    fireEvent.keyDown(attributesInput as HTMLElement, { keyCode: 40 });
    let attributesOption = await screen.findByText(sampleAttributes[0].name);
    fireEvent.click(attributesOption);

    fireEvent.keyDown(attributesInput as HTMLElement, { keyCode: 40 });
    attributesOption = await screen.findByText(sampleAttributes[1].name);
    fireEvent.click(attributesOption);

    fireEvent.keyDown(attributesInput as HTMLElement, { keyCode: 40 });
    attributesOption = await screen.findByText(sampleAttributes[2].name);
    fireEvent.click(attributesOption);

    fireEvent.click(sandbox.developmentBox);
    const devHomePageUrisSelector = '#root_devHomePageUri';
    const uriInput = document.querySelector(devHomePageUrisSelector) as HTMLElement;
    fireEvent.change(uriInput, { target: { value: 'https://valid-uri' } });
  });

  it('should keep BCSC privacy zone and attributes editable if not approved yet', async () => {
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bcservicescard', 'bceidbasic'],
      status: 'applied',
      environments: ['dev', 'test', 'prod'],
      devValidRedirectUris: ['https://dev1.com', 'https://dev2.com'],
      testValidRedirectUris: ['https://test1.com', 'https://test2.com'],
      prodValidRedirectUris: ['https://prod1.com', 'https://prod2.com'],
      bcServicesCardApproved: false,
    });
    fireEvent.click(sandbox.basicInfoBox);
    const bcscCheckbox = getByText('BC Services Card')?.parentElement?.querySelector("input[type='checkbox']");
    expect(bcscCheckbox).not.toBeDisabled();
    expect(bcscCheckbox).toBeChecked();
    const bcscPrivacyZoneDropDown = screen.getByTestId('bcsc-privacy-zone') as HTMLElement;
    expect(bcscPrivacyZoneDropDown?.querySelector("input[type='text']")).not.toBeDisabled();

    const bcscAttributesDropDown = screen.getByTestId('bcsc-attributes') as HTMLElement;
    const attributesInput = bcscAttributesDropDown.lastChild;
    fireEvent.keyDown(attributesInput as HTMLElement, { keyCode: 40 });
    let attributesOption = await screen.findByText(sampleAttributes[0].name);
    fireEvent.click(attributesOption);
    expect(bcscAttributesDropDown?.querySelector("input[type='text']")).not.toBeDisabled();
  });

  it('should freeze BC Services Card IDP and show privacy zone and attributes if approved', async () => {
    const { getByText } = setUpRender({
      id: 0,
      serviceType: 'gold',
      devIdps: ['bcservicescard', 'bceidbasic'],
      status: 'applied',
      environments: ['dev', 'test', 'prod'],
      devValidRedirectUris: ['https://dev1.com', 'https://dev2.com'],
      testValidRedirectUris: ['https://test1.com', 'https://test2.com'],
      prodValidRedirectUris: ['https://prod1.com', 'https://prod2.com'],
      bcServicesCardApproved: true,
    });
    fireEvent.click(sandbox.basicInfoBox);
    const bcscCheckbox = getByText('BC Services Card')?.parentElement?.querySelector("input[type='checkbox']");
    expect(bcscCheckbox).toBeDisabled();
    expect(bcscCheckbox).toBeChecked();
    const bcscPrivacyZoneDropDown = screen.getByTestId('bcsc-privacy-zone') as HTMLElement;
    expect(bcscPrivacyZoneDropDown?.querySelector("input[type='text']")).toBeDisabled();
    const bcscAttributesDropDown = screen.getByTestId('bcsc-attributes') as HTMLElement;
    expect(bcscAttributesDropDown?.querySelector("input[type='text']")).toBeDisabled();
  });

  it('should only show the BCSC IDP when not using production if the ALLOW_BC_SERVICES_CARD_PROD feature flag is off', async () => {
    process.env.ALLOW_BC_SERVICES_CARD_PROD = 'false';
    const { queryByText } = setUpRender({
      id: 0,
      environments: ['dev'],
    });
    fireEvent.click(sandbox.basicInfoBox);
    const bcscCheckbox = queryByText('BC Services Card');
    const productionCheckbox = queryByText('Production', { selector: '.checkbox span' }) as HTMLElement;
    expect(bcscCheckbox).toBeInTheDocument();

    fireEvent.click(productionCheckbox);
    expect(bcscCheckbox).not.toBeInTheDocument();
  });

  it('should only show the production environment when BCSC IDP is unselected if the ALLOW_BC_SERVICES_CARD_PROD feature flag is off', async () => {
    process.env.ALLOW_BC_SERVICES_CARD_PROD = 'false';
    const { queryByText } = setUpRender({
      id: 0,
      environments: ['dev'],
    });
    fireEvent.click(sandbox.basicInfoBox);
    let productionCheckbox = queryByText('Production', { selector: '.checkbox span' }) as HTMLElement;
    expect(productionCheckbox).toBeInTheDocument();

    const bcscCheckbox = queryByText('BC Services Card') as HTMLElement;
    fireEvent.click(bcscCheckbox);
    expect(productionCheckbox).not.toBeInTheDocument();
  });

  it('should always show production and bcsc idp when the ALLOW_BC_SERVICES_CARD_PROD flag is on', async () => {
    process.env.ALLOW_BC_SERVICES_CARD_PROD = 'true';
    const { queryByText } = setUpRender({
      id: 0,
      environments: ['dev'],
    });
    fireEvent.click(sandbox.basicInfoBox);
    const productionCheckbox = queryByText('Production', { selector: '.checkbox span' }) as HTMLElement;
    const bcscCheckbox = queryByText('BC Services Card') as HTMLElement;

    expect(productionCheckbox).toBeInTheDocument();
    expect(bcscCheckbox).toBeInTheDocument();

    fireEvent.click(productionCheckbox);
    expect(bcscCheckbox).toBeInTheDocument();

    fireEvent.click(bcscCheckbox);
    expect(productionCheckbox).toBeInTheDocument();
  });

  it('should show idir idp for existing integrations for regular users that already use it', async () => {
    const { getByText } = setUpRender({
      id: 0,
      environments: ['dev'],
      devIdps: ['idir', 'azureidir'],
      projectName: 'test project3',
    });
    fireEvent.click(sandbox.basicInfoBox);
    const idirCheckbox = getByText('IDIR')?.parentElement?.querySelector("input[type='checkbox']");
    const azureIdirCheckbox = getByText('IDIR - MFA')?.parentElement?.querySelector("input[type='checkbox']");
    expect(idirCheckbox).toBeVisible();
    expect(idirCheckbox).toBeChecked();
    expect(azureIdirCheckbox).toBeChecked();
  });

  it('should not show idir idp for regular users updating existing integrations without it', async () => {
    const { getByText, queryByText } = setUpRender({
      id: 0,
      environments: ['dev'],
      devIdps: ['azureidir'],
      projectName: 'test project4',
    });
    fireEvent.click(sandbox.basicInfoBox);
    const azureIdirCheckbox = getByText('IDIR - MFA')?.parentElement?.querySelector("input[type='checkbox']");
    expect(queryByText('IDIR')).toBeNull();
    expect(azureIdirCheckbox).toBeChecked();
  });

  it('should show idir idp for existing integrations without it for admin users', async () => {
    const { queryByText } = setUpRender(
      {
        id: 0,
        environments: ['dev'],
        devIdps: [],
        projectName: 'test project4',
      },
      { client_roles: ['sso-admin'], isAdmin: true },
    );
    fireEvent.click(sandbox.basicInfoBox);
    expect(queryByText('IDIR')).not.toBeNull();
  });
});

describe('Social IDP', () => {
  const defaultRender = {
    id: 0,
    serviceType: 'gold',
    status: 'draft',
    environments: ['dev', 'test', 'prod'],
  };
  it('Shows social IDP when the env variable is set', async () => {
    process.env.INCLUDE_SOCIAL = 'true';
    const { queryByText } = setUpRender(defaultRender);

    fireEvent.click(sandbox.basicInfoBox);
    const checkbox = queryByText('Social')?.parentElement?.querySelector("input[type='checkbox") as HTMLInputElement;
    expect(checkbox).toBeTruthy();
  });

  it('Does not show social IDP when the env variable is explicitly false', async () => {
    process.env.INCLUDE_SOCIAL = 'false';
    const { queryByText } = setUpRender(defaultRender);

    fireEvent.click(sandbox.basicInfoBox);
    const checkbox = queryByText('Social')?.parentElement?.querySelector("input[type='checkbox") as HTMLInputElement;
    expect(checkbox).toBeFalsy();
  });

  it('Defaults to not show social IDP when env variable is missing', async () => {
    process.env.INCLUDE_SOCIAL = undefined;
    const { queryByText } = setUpRender(defaultRender);

    fireEvent.click(sandbox.basicInfoBox);
    const checkbox = queryByText('Social')?.parentElement?.querySelector("input[type='checkbox") as HTMLInputElement;
    expect(checkbox).toBeFalsy();
  });

  it('Displays social terms and conditions only when social IDP is selected', async () => {
    process.env.INCLUDE_SOCIAL = 'true';
    const { queryByText } = setUpRender(defaultRender);

    fireEvent.click(sandbox.basicInfoBox);
    const socialCheckbox = queryByText('Social')?.parentElement?.querySelector(
      "input[type='checkbox",
    ) as HTMLInputElement;
    let socialTermsAndConditionsCheckbox = document.querySelector('#root_confirmSocial');
    expect(socialTermsAndConditionsCheckbox).toBeFalsy();

    fireEvent.click(socialCheckbox);
    socialTermsAndConditionsCheckbox = document.querySelector('#root_confirmSocial');
    expect(socialTermsAndConditionsCheckbox).toBeTruthy();
  });

  it('Displays error when terms and conditions is not checked and clears once selected', async () => {
    process.env.INCLUDE_SOCIAL = 'true';
    const { queryByText } = setUpRender(defaultRender);

    fireEvent.click(sandbox.basicInfoBox);
    const socialCheckbox = queryByText('Social')?.parentElement?.querySelector(
      "input[type='checkbox",
    ) as HTMLInputElement;

    fireEvent.click(socialCheckbox);

    // Live validation turns on after user leaves the page, leave and return to trigger
    fireEvent.click(sandbox.developmentBox);
    fireEvent.click(sandbox.basicInfoBox);

    const expectedErrorText = errorMessages.confirmSocial;

    expect(queryByText(expectedErrorText)).toBeTruthy();

    const socialTermsAndConditionsCheckbox = document.querySelector('#root_confirmSocial') as HTMLInputElement;
    fireEvent.click(socialTermsAndConditionsCheckbox);
    expect(queryByText(expectedErrorText)).toBeFalsy();
  });
});
