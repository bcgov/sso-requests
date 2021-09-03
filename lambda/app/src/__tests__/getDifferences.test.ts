import { getDifferences } from '../utils/helpers';
import { formDataOriginal, formDataUpdated } from './fixtures';

const expectedDiff = [{ kind: 'E', lhs: 'https://b', path: ['devValidRedirectUris', 0], rhs: 'https://a' }];

it('should display the differences', () => {
  expect(getDifferences(formDataOriginal, formDataUpdated)).toEqual(expectedDiff);
});
