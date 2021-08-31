import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FormStage from 'form-components/FormStage';
import { bceidStages } from 'utils/constants';

const creatingNewForm = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
const setFormStage = jest.fn();
const errors = {
  '0': [{}],
};

const STEPPER_ERROR = 'Some additional fields require your attention.';

describe('Form Stage', () => {
  it('Only allows navigation once a request is created', () => {
    render(
      <FormStage
        creatingNewForm={creatingNewForm}
        currentStage={0}
        setFormStage={setFormStage}
        errors={{}}
        visited={{}}
        stages={bceidStages}
      />,
    );
    fireEvent.click(screen.getByText('Providers and URIs'));
    expect(setFormStage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Terms and conditions'));
    expect(setFormStage).toHaveBeenCalledWith(2);
  });
  it('Displays error states correctly', () => {
    render(
      <FormStage
        creatingNewForm={creatingNewForm}
        currentStage={0}
        setFormStage={setFormStage}
        errors={errors}
        visited={{}}
        stages={bceidStages}
      />,
    );
    const firstStageBox = screen.getByText('Requester Info').closest('div') as HTMLElement;
    expect(within(firstStageBox).getByTitle(STEPPER_ERROR));
    const secondStageBox = screen.getByText('Providers and URIs').closest('div') as HTMLElement;
    expect(within(secondStageBox).queryByTitle('error')).toBeNull();
  });
});
