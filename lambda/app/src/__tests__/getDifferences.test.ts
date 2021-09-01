import { getDifferences } from '../utils/helpers';
import { formDataOriginal, formDataUpdated } from './fixtures';

const expectedDiff = [{ kind: 'E', lhs: 'https://a', path: ['devValidRedirectUris', 0], rhs: 'https://b' }];

it('should display the differences', () => {
  expect(getDifferences(formDataOriginal, formDataUpdated)).toEqual(expectedDiff);
});
