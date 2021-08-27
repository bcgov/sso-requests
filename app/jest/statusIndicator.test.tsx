import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import { sampleRequest } from './form.test';
import type { Status } from './types';

describe('Submission Status Indicator', () => {
  it('Should show the planned message', () => {
    const selectedRequest = { ...sampleRequest, status: 'planned' as Status };
    render(<SubmittedStatusIndicator selectedRequest={selectedRequest} />);
    expect(screen.getByText('Terraform plan succeeded...'));
  });
  it('Should show the submitted message', () => {
    const selectedRequest = { ...sampleRequest, status: 'submitted' as Status };
    render(<SubmittedStatusIndicator selectedRequest={selectedRequest} />);
    expect(screen.getByText('Process request submitted...'));
  });
  it('Should show the created message', () => {
    const selectedRequest = { ...sampleRequest, status: 'pr' as Status };
    render(<SubmittedStatusIndicator selectedRequest={selectedRequest} />);
    expect(screen.getByText('Pull request created...'));
  });
  it('Should show the error message', () => {
    let selectedRequest = { ...sampleRequest, status: 'prFailed' as Status };
    render(<SubmittedStatusIndicator selectedRequest={selectedRequest} />);
    expect(screen.getByText('An error has occurred'));
    cleanup();

    selectedRequest = { ...sampleRequest, status: 'planFailed' as Status };
    render(<SubmittedStatusIndicator selectedRequest={selectedRequest} />);
    expect(screen.getByText('An error has occurred'));
    cleanup();

    selectedRequest = { ...sampleRequest, status: 'applyFailed' as Status };
    render(<SubmittedStatusIndicator selectedRequest={selectedRequest} />);
    expect(screen.getByText('An error has occurred'));
    cleanup();
  });
  it('Should show the last updated date', () => {
    const selectedRequest = { ...sampleRequest, status: 'pr' as Status, updatedAt: '2021-08-20T18:50:04.115Z' };
    render(<SubmittedStatusIndicator selectedRequest={selectedRequest} />);
    expect(screen.getByText(`Last updated at ${new Date('2021-08-20T18:50:04.115Z').toLocaleString()}`));
  });
});
