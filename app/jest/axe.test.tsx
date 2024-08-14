import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import React from 'react';
import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom/extend-expect';
import LandingPage from 'pages/index';
import AdminDashboard from 'pages/admin-dashboard';
import ApplicationError from 'pages/application-error';
import MyDashboard from 'pages/my-dashboard';
import TermsAndConditions from 'pages/terms-conditions';
import RequestPage from 'pages/request/index';
import FormTemplate from 'form-components/FormTemplate';

const sampleSession = {
  email: '',
  client_roles: [],
  roles: [],
  isAdmin: false,
};

expect.extend(toHaveNoViolations);

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ query: {}, push: jest.fn, route: '' })),
}));

jest.mock('services/request', () => {
  return {
    createRequest: jest.fn(),
    updateRequest: jest.fn(() => Promise.resolve([{}, null])),
    getRequest: jest.fn(() => []),
    getRequestAll: jest.fn(() => []),
    getTeamIntegrations: jest.fn(() => []),
    getRequests: jest.fn(() => []),
  };
});

jest.mock('services/bc-services-card', () => {
  return {
    fetchPrivacyZones: jest.fn(() => {
      return Promise.resolve([[], null]);
    }),
    fetchAttributes: jest.fn(() => {
      return Promise.resolve([[], null]);
    }),
  };
});

describe('Pages', () => {
  it('Should have no accessibility violations (Landing Page)', async () => {
    const { container } = render(
      <LandingPage session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // it('Should have no accessibility violations (Admin Dashboard)', async () => {
  //   const { container } = render(
  //     <AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
  //   );
  //   const results = await axe(container);
  //   expect(results).toHaveNoViolations();
  // });

  it('Should have no accessibility violations (Error Page)', async () => {
    const { container } = render(<ApplicationError />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Should have no accessibility violations (Terms and Conditions)', async () => {
    const { container } = render(<TermsAndConditions />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Should have no accessibility violations (Request Page)', async () => {
    const { container } = render(<RequestPage session={sampleSession} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Should have no accessibility violations with the form open (Form Template)', async () => {
    const { container } = render(<FormTemplate currentUser={sampleSession} request={{ projectLead: true }} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
