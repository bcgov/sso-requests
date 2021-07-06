import { FormattedData } from '../../shared/interfaces';

// GH actions inputs expects an object where all values are strings
export const stringifyGithubInputs = (inputs: FormattedData) => {
  const stringifiedInputs = {};
  Object.entries(inputs).map(([key, value]) => {
    stringifiedInputs[key] = typeof value === 'string' ? value : JSON.stringify(value);
  });
  return stringifiedInputs;
};
