import { validateRequest, errorMessage } from '../utils/helpers';
import { formDataUpdated, formDataOriginal, formDataWithMutatedNonFormFields } from './fixtures';

it('should respond valid if there are valid changes', () => {
  expect(validateRequest(formDataOriginal, formDataUpdated, true)).toBe(true);
});

it('should respond invalid if there are no changes', () => {
  const originalWithSameValues = { ...formDataOriginal, devValidRedirectUris: ['https://b'] };
  expect(validateRequest(formDataOriginal, formDataWithMutatedNonFormFields, true)).toEqual({ message: errorMessage });
  expect(validateRequest(originalWithSameValues, formDataUpdated, true)).toEqual({ message: errorMessage });
});
