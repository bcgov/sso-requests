import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FormStage from 'form-components/FormStage';
import { getSchemas } from 'schemas';

const setFormStage = jest.fn();
const errors = {
  '0': [{}],
};

const STEPPER_ERROR = 'Some additional fields require your attention.';
const newIntegrationSchemas = getSchemas({ integration: {}, formData: {}, teams: [] });

describe('Form Stage', () => {
  it('Only allows navigation once a request is created', () => {
    render(
      <FormStage
        isNew={true}
        currentStage={0}
        setFormStage={setFormStage}
        errors={{}}
        visited={{}}
        schemas={newIntegrationSchemas}
      />,
    );
    fireEvent.click(screen.getByText('Providers and URIs'));
    expect(setFormStage).not.toHaveBeenCalled();
  });

  it('Displays error states correctly', () => {
    render(
      <FormStage
        isNew={false}
        currentStage={0}
        setFormStage={setFormStage}
        errors={errors}
        visited={{}}
        schemas={newIntegrationSchemas}
      />,
    );
    const firstStageBox = screen.getByText('Requester Info').closest('div') as HTMLElement;
    expect(within(firstStageBox).getByTitle(STEPPER_ERROR));
    const secondStageBox = screen.getByText('Providers and URIs').closest('div') as HTMLElement;
    expect(within(secondStageBox).queryByTitle('error')).toBeNull();
  });

  it('Shows the passed in stages correctly', () => {
    render(
      <FormStage
        isNew={false}
        currentStage={0}
        setFormStage={setFormStage}
        errors={errors}
        visited={{}}
        schemas={newIntegrationSchemas}
      />,
    );
    const bceidTitles = newIntegrationSchemas.map((schema) => schema.stepText);
    bceidTitles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });
});
