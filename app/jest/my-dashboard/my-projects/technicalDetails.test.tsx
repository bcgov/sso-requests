import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import IntegrationInfoTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import { getInstallation } from 'services/keycloak';
import { sampleRequest } from '../../samples/integrations';
import type { Status } from 'interfaces/types';

type Text = string | RegExp;
const expectText = (text: Text) => expect(screen.getByText(text)).toBeTruthy();
const expectAllTexts = (texts: Text[]) => texts.forEach(expectText);
const notExpectText = (text: Text) => expect(screen.queryByText(text)).toBeNull();
const notExpectAllTexts = (texts: Text[]) => texts.forEach(notExpectText);

const bceidApprovedLastChange = { lhs: false, rhs: true, kind: 'E', path: ['bceidApproved'] };
const githubApprovedLastChange = { lhs: false, rhs: true, kind: 'E', path: ['githubApproved'] };

const HYPERLINK = 'https://bcgov.github.io/sso-docs/integrating-your-application/installation-json';
const WIKI_PAGE_HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki/Creating-a-Role';

const DRAFT_MESSAGE = /Your request has not been submitted/;
const PROGRESS_MESSAGE = /Access to environment\(s\) will be provided/;
const INSTALLATION_LABEL = /Installation JSONs/;
const BCEID_PROD_LABEL = /Access to BCeID Prod/;
const BCEID_PROD_REQUESTED_MESSAGE = /Please reach out to IDIM/;
const BCEID_PROD_APPROVED = /Your integration has been approved/;
const BCEID_PROD_AVAILABLE = /Your integration is approved and available/;
const GITHUB_PROD_LABEL = /Access to GitHub Prod/;
const GITHUB_PROD_REQUESTED_MESSAGE = /Requirements email sent to GCIO/;
const GITHUB_PROD_APPROVED = /Your integration has been approved/;
const GITHUB_PROD_AVAILABLE = /Your integration is approved and available/;
const DEV_IDIR_BCEID_ENV_HEADER = /Development \(IDIR, Basic BCeID, GitHub\)/;
const TEST_IDIR_BCEID_ENV_HEADER = /Test \(IDIR, Basic BCeID, GitHub\)/;

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

    expectAllTexts([PROGRESS_MESSAGE]);
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

    expectAllTexts([
      PROGRESS_MESSAGE,
      BCEID_PROD_LABEL,
      BCEID_PROD_REQUESTED_MESSAGE,
      GITHUB_PROD_LABEL,
      GITHUB_PROD_REQUESTED_MESSAGE,
    ]);
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

    expectAllTexts([INSTALLATION_LABEL, BCEID_PROD_LABEL, GITHUB_PROD_LABEL]);
    expect(screen.getAllByText(BCEID_PROD_APPROVED)).toBeTruthy();
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
});

describe('Applied Status header, button and link test', () => {
  it('should display correct environment header; and match the correct attribute of the hyper link', async () => {
    render(
      <IntegrationInfoTabs
        integration={{
          status: 'applied',
          authType: 'browser-login',
          environments: ['dev', 'test'],
          devIdps: ['idir', 'bceidbasic', 'githubpublic'],
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

describe('Submission Status Indicator', () => {
  it('Should show the planned message', () => {
    render(<SubmittedStatusIndicator integration={{ ...sampleRequest, status: 'planned' as Status }} />);
    expect(screen.getByText('Terraform plan succeeded...'));
  });
  it('Should show the submitted message', () => {
    render(<SubmittedStatusIndicator integration={{ ...sampleRequest, status: 'submitted' as Status }} />);
    expect(screen.getByText('Process request submitted...'));
  });
  it('Should show the created message', () => {
    render(<SubmittedStatusIndicator integration={{ ...sampleRequest, status: 'pr' as Status }} />);
    expect(screen.getByText('Pull request created...'));
  });
  it('Should show the error message', () => {
    render(<SubmittedStatusIndicator integration={{ ...sampleRequest, status: 'prFailed' as Status }} />);
    expect(screen.getByText('An error has occurred'));
    cleanup();

    render(<SubmittedStatusIndicator integration={{ ...sampleRequest, status: 'planFailed' as Status }} />);
    expect(screen.getByText('An error has occurred'));
    cleanup();

    render(<SubmittedStatusIndicator integration={{ ...sampleRequest, status: 'applyFailed' as Status }} />);
    expect(screen.getByText('An error has occurred'));
    cleanup();
  });
  it('Should show the last updated date', () => {
    render(
      <SubmittedStatusIndicator
        integration={{ ...sampleRequest, status: 'pr' as Status, updatedAt: '2021-08-20T18:50:04.115Z' }}
      />,
    );
    expect(screen.getByText(`Last updated at ${new Date('2021-08-20T18:50:04.115Z').toLocaleString()}`));
  });
});
