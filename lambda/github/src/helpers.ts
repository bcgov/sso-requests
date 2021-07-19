import { FormattedData } from '../../shared/interfaces';

const isObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

// GH actions inputs expects an object where all values are strings
export const stringifyGithubInputs = (inputs: FormattedData) => {
  const stringifiedInputs = {};
  Object.entries(inputs).map(([key, value]) => {
    if (isObject(value) || Array.isArray(value)) {
      stringifiedInputs[key] = JSON.stringify(value);
    } else {
      stringifiedInputs[key] = String(value);
    }
  });

  return stringifiedInputs;
};
