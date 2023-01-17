import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import { sampleRequest } from '../../../samples/integrations';
import type { Status } from 'interfaces/types';

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
