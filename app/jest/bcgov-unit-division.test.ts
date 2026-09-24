import { customValidate } from 'utils/validate';
import { getApplicationNotes } from 'utils/entra-helpers';

const makeErrors = (fields: string[]) =>
  fields.reduce((acc: any, field) => {
    acc[field] = { addError: jest.fn() };
    return acc;
  }, {});

const validateBcgovFields = (formData: any) => {
  const errors = makeErrors(['description', 'bcgovUnitId', 'divisionId']);
  customValidate(formData, errors, {}, ['description', 'bcgovUnitId', 'divisionId']);
  return errors;
};

describe('customValidate bcgov unit / division / description requirements', () => {
  it('requires description, bcgovUnitId, and divisionId when bcgovidir is selected', () => {
    const errors = validateBcgovFields({ devIdps: ['bcgovidir'] });

    expect(errors.description.addError).toHaveBeenCalledWith('Project description is required');
    expect(errors.bcgovUnitId.addError).toHaveBeenCalledWith('BC Government Unit is required');
    expect(errors.divisionId.addError).toHaveBeenCalledWith('Division is required');
  });

  it('treats a blank description and a 0 id as missing', () => {
    const errors = validateBcgovFields({
      devIdps: ['bcgovidir'],
      description: '   ',
      bcgovUnitId: 0,
      divisionId: 0,
    });

    expect(errors.description.addError).toHaveBeenCalledWith('Project description is required');
    expect(errors.bcgovUnitId.addError).toHaveBeenCalledWith('BC Government Unit is required');
    expect(errors.divisionId.addError).toHaveBeenCalledWith('Division is required');
  });

  it('passes once description, bcgovUnitId, and divisionId are all provided', () => {
    const errors = validateBcgovFields({
      devIdps: ['bcgovidir'],
      description: 'A real project description',
      bcgovUnitId: 1,
      divisionId: 2,
    });

    expect(errors.description.addError).not.toHaveBeenCalled();
    expect(errors.bcgovUnitId.addError).not.toHaveBeenCalled();
    expect(errors.divisionId.addError).not.toHaveBeenCalled();
  });

  it('does not require these fields for non-bcgovidir integrations', () => {
    const errors = validateBcgovFields({ devIdps: ['azureidir'] });

    expect(errors.description.addError).not.toHaveBeenCalled();
    expect(errors.bcgovUnitId.addError).not.toHaveBeenCalled();
    expect(errors.divisionId.addError).not.toHaveBeenCalled();
  });
});

describe('getApplicationNotes', () => {
  it('formats the app registration notes with the requester, unit, division, and description', () => {
    const notes = getApplicationNotes({
      environment: 'dev',
      requester: 'Jane Doe',
      bcgovUnitName: 'Citizens Services',
      divisionName: 'Technology Division',
      description: 'A project that does things',
    });

    const lines = notes.split('\n');
    expect(lines[0]).toBe('Created by: Jane Doe');
    expect(lines[1]).toMatch(/^On: /);
    expect(lines[2]).toBe('On behalf of: Citizens Services - Technology Division');
    expect(lines[3]).toBe('Description: A project that does things');
    expect(lines[4]).toMatch(/^Authentication to this app is brokered by .* - dev$/);
  });
});
