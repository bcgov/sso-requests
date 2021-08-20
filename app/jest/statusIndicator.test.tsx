import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';

describe('Submission Status Indicator', () => {
  it('Should show the planned message', () => {
    render(<SubmittedStatusIndicator status="planned" />);
    expect(screen.getByText('Terraform plan succeeded...'));
  });
  it('Should show the submitted message', () => {
    render(<SubmittedStatusIndicator status="submitted" />);
    expect(screen.getByText('Process request submitted...'));
  });
  it('Should show the created message', () => {
    render(<SubmittedStatusIndicator status="pr" />);
    expect(screen.getByText('Pull request created...'));
  });
  it('Should show the error message', () => {
    render(<SubmittedStatusIndicator status="prFailed" />);
    expect(screen.getByText('An error has occurred'));
    cleanup();

    render(<SubmittedStatusIndicator status="planFailed" />);
    expect(screen.getByText('An error has occurred'));
    cleanup();

    render(<SubmittedStatusIndicator status="applyFailed" />);
    expect(screen.getByText('An error has occurred'));
    cleanup();
  });
  it('Should show the last updated date', () => {
    render(<SubmittedStatusIndicator status="pr" updatedAt={'2021-08-20T18:50:04.115Z'} />);
    expect(screen.getByText(`Last updated at ${new Date('2021-08-20T18:50:04.115Z').toLocaleString()}`));
  });
});
