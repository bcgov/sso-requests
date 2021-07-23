import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FormStage from 'form-components/FormStage';
import { FormErrors } from 'interfaces/form';

const creatingNewForm = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
const setFormStage = jest.fn();
const errors: FormErrors = {
  firstPageErrors: [{}],
  secondPageErrors: [],
};

describe('Form Stage', () => {
  it('Only allows navigation once a request is created', () => {
    render(<FormStage creatingNewForm={creatingNewForm} currentStage={1} setFormStage={setFormStage} errors={null} />);
    fireEvent.click(screen.getByText('Providers and URIs'));
    expect(setFormStage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Terms and conditions'));
    expect(setFormStage).toHaveBeenCalledWith(3);
  });
  it('Displays error states correctly', () => {
    render(
      <FormStage creatingNewForm={creatingNewForm} currentStage={1} setFormStage={setFormStage} errors={errors} />,
    );
    const firstStageBox = screen.getByText('Requester Info').closest('div') as HTMLElement;
    expect(within(firstStageBox).getByTitle('error'));
    const secondStageBox = screen.getByText('Providers and URIs').closest('div') as HTMLElement;
    expect(within(secondStageBox).queryByTitle('error')).toBeNull();
  });
});
