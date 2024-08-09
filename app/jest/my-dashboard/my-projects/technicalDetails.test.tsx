import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IntegrationInfoTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import { getInstallation } from 'services/keycloak';
import { docusaurusURL, formatWikiURL } from '@app/utils/constants';

type Text = string | RegExp;
const expectText = (text: Text) => expect(screen.getByText(text)).toBeTruthy();
const expectAllTexts = (texts: Text[]) => texts.forEach(expectText);
const notExpectText = (text: Text) => expect(screen.queryByText(text)).toBeNull();
const notExpectAllTexts = (texts: Text[]) => texts.forEach(notExpectText);

const bceidApprovedLastChange = { lhs: false, rhs: true, kind: 'E', path: ['bceidApproved'] };
const githubApprovedLastChange = { lhs: false, rhs: true, kind: 'E', path: ['githubApproved'] };

const HYPERLINK = `${docusaurusURL}/integrating-your-application/installation-json`;
const WIKI_PAGE_HYPERLINK = formatWikiURL('Creating-a-Role');

const DRAFT_MESSAGE = /Your request has not been submitted/;
const PROGRESS_MESSAGE = /Access to environment\(s\) will be provided/;
const INSTALLATION_LABEL = /Installation JSONs/;
const BCEID_PROD_LABEL = /Access to BCeID Prod/;
const BCEID_PROD_REQUESTED_MESSAGE = /Please reach out to IDIM/;
const BCEID_PROD_APPROVED = /Your integration has been approved/;
const BCEID_PROD_AVAILABLE = /Your integration is approved and available/;
const DC_PROD_LABEL = /Access to Digital Credential Prod/;
const DC_PROD_REQUESTED_MESSAGE = /Please reach out to DIT/;
const DC_PROD_APPROVED = /Your integration has been approved/;
const DC_PROD_AVAILABLE = /Your integration is approved and available/;
const BCSC_PROD_LABEL = /Access to BC Services Card Prod/;
const BCSC_PROD_REQUESTED_MESSAGE = /Please reach out to IDIM/;
const BCSC_PROD_APPROVED = /Your integration has been approved/;
const BCSC_PROD_AVAILABLE = /Your integration is approved and available/;
const GITHUB_PROD_LABEL = /Access to GitHub Prod/;
const GITHUB_PROD_REQUESTED_MESSAGE = /Requirements email sent to GCIO/;
const GITHUB_PROD_APPROVED = /Your integration has been approved/;
const GITHUB_PROD_AVAILABLE = /Your integration is approved and available/;

const DEV_IDIR_BCEID_ENV_HEADER = /Development \(IDIR, Basic BCeID, GitHub, Digital Credential, BC Services Card\)/;
const TEST_IDIR_BCEID_ENV_HEADER = /Test \(IDIR, Basic BCeID, GitHub, Digital Credential, BC Services Card\)/;

jest.mock('services/keycloak', () => ({
  getInstallation: jest.fn(() => Promise.resolve([['installation_data'], null])),
}));

jest.mock('utils/text', () => ({
  downloadText: jest.fn(() => {
    return true;
  }),
  prettyJSON: jest.fn(() => {
    ('');
  }),
  copyTextToClipboard: jest.fn(() => {
    return true;
  }),
}));

describe('Draft Status', () => {
  it('should display draft integration screen', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'draft',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir', 'bceidbasic'],
          lastChanges: null,
          bceidApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expectText(DRAFT_MESSAGE);
    notExpectAllTexts([
      PROGRESS_MESSAGE,
      INSTALLATION_LABEL,
      BCEID_PROD_LABEL,
      BCEID_PROD_REQUESTED_MESSAGE,
      BCEID_PROD_APPROVED,
      BCEID_PROD_AVAILABLE,
    ]);
  });
});

describe('Submitted Status', () => {
  it('should display non-BCeID-non-github-prod integration screen', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'submitted',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir'],
          lastChanges: null,
          bceidApproved: false,
          githubApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expect(screen.queryByTestId('grid-svg')).toBeVisible();

    notExpectAllTexts([
      DRAFT_MESSAGE,
      INSTALLATION_LABEL,
      BCEID_PROD_LABEL,
      BCEID_PROD_REQUESTED_MESSAGE,
      BCEID_PROD_APPROVED,
      BCEID_PROD_AVAILABLE,
      GITHUB_PROD_LABEL,
      GITHUB_PROD_REQUESTED_MESSAGE,
      GITHUB_PROD_APPROVED,
      GITHUB_PROD_AVAILABLE,
    ]);
  });

  it('should display BCeID-prod-GitHub-prod-integration screen', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'submitted',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir', 'bceidbasic', 'githubpublic'],
          lastChanges: null,
          bceidApproved: false,
          githubApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expect(screen.queryByTestId('grid-svg')).toBeVisible();
    notExpectAllTexts([
      DRAFT_MESSAGE,
      INSTALLATION_LABEL,
      BCEID_PROD_APPROVED,
      BCEID_PROD_AVAILABLE,
      GITHUB_PROD_APPROVED,
      GITHUB_PROD_AVAILABLE,
    ]);
  });

  it('should display BCeID-prod-GitHub-prod-being-approved integration screen', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'submitted',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir', 'bceidbasic', 'githubpublic'],
          lastChanges: [bceidApprovedLastChange, githubApprovedLastChange],
          bceidApproved: false,
          githubApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expect(screen.queryByTestId('grid-svg')).toBeVisible();
    notExpectAllTexts([
      DRAFT_MESSAGE,
      PROGRESS_MESSAGE,
      BCEID_PROD_REQUESTED_MESSAGE,
      BCEID_PROD_AVAILABLE,
      GITHUB_PROD_REQUESTED_MESSAGE,
      GITHUB_PROD_AVAILABLE,
    ]);
  });
});

describe('Applied Status', () => {
  it('should display non-BCeID-non-GitHub-prod integration screen, and correct header for different environments', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir'],
          lastChanges: null,
          bceidApproved: false,
          githubApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expectText(INSTALLATION_LABEL);
    notExpectAllTexts([
      DRAFT_MESSAGE,
      PROGRESS_MESSAGE,
      BCEID_PROD_LABEL,
      BCEID_PROD_REQUESTED_MESSAGE,
      BCEID_PROD_APPROVED,
      BCEID_PROD_AVAILABLE,
      GITHUB_PROD_LABEL,
      GITHUB_PROD_REQUESTED_MESSAGE,
      GITHUB_PROD_APPROVED,
      GITHUB_PROD_AVAILABLE,
    ]);
  });

  it('should display BCeID-prod-Github-prod-integration screen', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir', 'bceidbasic', 'githubpublic'],
          lastChanges: null,
          bceidApproved: false,
          githubApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expectAllTexts([
      INSTALLATION_LABEL,
      BCEID_PROD_LABEL,
      BCEID_PROD_REQUESTED_MESSAGE,
      GITHUB_PROD_LABEL,
      GITHUB_PROD_REQUESTED_MESSAGE,
    ]);
    notExpectAllTexts([
      DRAFT_MESSAGE,
      PROGRESS_MESSAGE,
      BCEID_PROD_APPROVED,
      BCEID_PROD_AVAILABLE,
      GITHUB_PROD_APPROVED,
      GITHUB_PROD_AVAILABLE,
    ]);
  });

  it('should display BCeID-prod-GitHub-prod-approved integration screen', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir', 'bceidbasic', 'githubpublic'],
          lastChanges: null,
          bceidApproved: true,
          githubApproved: true,
          serviceType: 'gold',
        }}
      />,
    );

    expectAllTexts([INSTALLATION_LABEL, BCEID_PROD_LABEL, GITHUB_PROD_LABEL]);
    expect(screen.getAllByText(BCEID_PROD_AVAILABLE)).toBeTruthy();
    notExpectAllTexts([
      DRAFT_MESSAGE,
      PROGRESS_MESSAGE,
      BCEID_PROD_APPROVED,
      BCEID_PROD_REQUESTED_MESSAGE,
      GITHUB_PROD_APPROVED,
      GITHUB_PROD_REQUESTED_MESSAGE,
    ]);
  });

  it('should display BCSC-prod-DC-prod-integration screen', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir', 'bcservicescard', 'digitalcredential'],
          lastChanges: null,
          digitalCredentialApproved: false,
          bcServicesCardApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expectAllTexts([
      INSTALLATION_LABEL,
      BCSC_PROD_LABEL,
      BCSC_PROD_REQUESTED_MESSAGE,
      DC_PROD_LABEL,
      DC_PROD_REQUESTED_MESSAGE,
    ]);
    notExpectAllTexts([
      DRAFT_MESSAGE,
      PROGRESS_MESSAGE,
      BCSC_PROD_APPROVED,
      BCSC_PROD_AVAILABLE,
      DC_PROD_APPROVED,
      DC_PROD_AVAILABLE,
    ]);
  });

  it('should display BCSC-prod-DC-prod-approved integration screen', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev', 'test', 'prod'],
          devIdps: ['idir', 'bcservicescard', 'digitalcredential'],
          lastChanges: null,
          digitalCredentialApproved: true,
          bcServicesCardApproved: true,
          serviceType: 'gold',
        }}
      />,
    );

    expectAllTexts([INSTALLATION_LABEL, BCSC_PROD_LABEL, DC_PROD_LABEL]);
    expect(screen.getAllByText(BCSC_PROD_AVAILABLE)).toBeTruthy();
    notExpectAllTexts([
      DRAFT_MESSAGE,
      PROGRESS_MESSAGE,
      BCSC_PROD_APPROVED,
      BCSC_PROD_REQUESTED_MESSAGE,
      DC_PROD_APPROVED,
      DC_PROD_REQUESTED_MESSAGE,
    ]);
  });
});

describe('Applied Status header, button and link test', () => {
  it('should display correct environment header; and match the correct attribute of the hyper link', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev', 'test'],
          devIdps: ['idir', 'bceidbasic', 'githubpublic', 'digitalcredential', 'bcservicescard'],
          lastChanges: null,
          bceidApproved: false,
          githubApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expectText(DEV_IDIR_BCEID_ENV_HEADER);
    expectText(TEST_IDIR_BCEID_ENV_HEADER);
    expect(screen.getByRole('link', { name: 'click to learn more on our wiki page' })).toHaveAttribute(
      'href',
      HYPERLINK,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Role Management' }));
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'wiki page' })).toHaveAttribute('href', WIKI_PAGE_HYPERLINK);
    });
  });

  it('should expect the correct end-point function been called with expected return data, after clicking on the Copy button', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev'],
          devIdps: ['idir'],
          lastChanges: null,
          bceidApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    expectText(INSTALLATION_LABEL);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => {
      expect(getInstallation).toHaveBeenCalled();
    });
  });

  it('should expect the correct end-point function been called with expected return data, after clicking on the Download button', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev'],
          devIdps: ['idir'],
          lastChanges: null,
          bceidApproved: false,
          serviceType: 'gold',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => {
      expect(getInstallation).toHaveBeenCalled();
    });
  });
});
