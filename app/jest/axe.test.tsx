import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import React from 'react';
import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom/extend-expect';
import LandingPage from 'pages/index';
import AdminDashboard from 'pages/admin-dashboard';
import ApplicationError from 'pages/application-error';
import EditRequest from 'pages/edit-request';
import MyRequests from 'pages/my-requests';
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
    getRequests: jest.fn(() => []),
  };
});

describe('Landing Page', () => {
  it('Should have no accessibility violations', async () => {
    const { container } = render(
      <LandingPage currentUser={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Admin Dashboard', () => {
  it('Should have no accessibility violations', async () => {
    const { container } = render(
      <AdminDashboard currentUser={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Error Page', () => {
  it('Should have no accessibility violations', async () => {
    const { container } = render(<ApplicationError />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Edit Page', () => {
  it('Should have no accessibility violations', async () => {
    const { container } = render(<EditRequest currentUser={sampleSession} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Requests Page', () => {
  it('Should have no accessibility violations', async () => {
    const { container } = render(
      <MyRequests currentUser={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Terms and Conditions', () => {
  it('Should have no accessibility violations', async () => {
    const { container } = render(
      <TermsAndConditions currentUser={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Request Page', () => {
  it('Should have no accessibility violations', async () => {
    const { container } = render(<RequestPage currentUser={sampleSession} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Form Template', () => {
  it('Should have no accessibility violations with the form open', async () => {
    const { container } = render(<FormTemplate currentUser={sampleSession} request={{ projectLead: true }} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
